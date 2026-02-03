import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialProvider, Prisma } from '@prisma/client';
import { createHmac, createHash, timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';

const DEFAULT_STATE_TTL_MINUTES = 20;
const FACEBOOK_GRAPH_VERSION = 'v18.0';

type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
};

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  authParams?: Record<string, string>;
  tokenMethod?: 'POST' | 'GET';
};

type OAuthStatePayloadV1 = {
  v: 1;
  provider: SocialProvider;
  proposalId: string;
  issuedAt: number;
};

type OAuthStatePayloadV2 = {
  v: 2;
  provider: SocialProvider;
  target: 'proposal' | 'draft';
  proposalId?: string;
  draftId?: string;
  issuedAt: number;
};

type OAuthStatePayload = OAuthStatePayloadV1 | OAuthStatePayloadV2;

type OAuthStateNormalized = {
  provider: SocialProvider;
  target: 'proposal' | 'draft';
  proposalId?: string;
  draftId?: string;
  issuedAt: number;
};

@Injectable()
export class PublicSocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async buildAuthorizeUrl(
    providerRaw: string,
    input: {
      proposalId?: string;
      token?: string;
      draftId?: string;
      draftToken?: string;
    },
  ) {
    const provider = this.parseProvider(providerRaw);
    const target = await this.resolveTarget(input);

    const config = this.getProviderConfig(provider);
    const state = this.signState({
      v: 2,
      provider,
      target: target.type,
      proposalId: target.type === 'proposal' ? target.id : undefined,
      draftId: target.type === 'draft' ? target.id : undefined,
      issuedAt: Date.now(),
    });

    const url = new URL(config.authUrl);
    const scopeValue =
      provider === SocialProvider.FACEBOOK ||
      provider === SocialProvider.INSTAGRAM
        ? config.scopes.join(',')
        : config.scopes.join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scopeValue,
      state,
    });

    if (config.authParams) {
      Object.entries(config.authParams).forEach(([key, value]) => {
        params.set(key, value);
      });
    }

    url.search = params.toString();
    return url.toString();
  }

  async handleCallback(
    providerRaw: string,
    code?: string,
    state?: string,
    error?: string,
  ) {
    const provider = this.parseProvider(providerRaw);

    if (error) {
      return {
        ok: false,
        redirectUrl: this.resolveErrorRedirect(state, error),
      };
    }

    if (!code || !state) {
      return {
        ok: false,
        redirectUrl: this.resolveErrorRedirect(state, 'missing_code'),
      };
    }

    const payload = this.verifyState(state);
    if (!payload) {
      return {
        ok: false,
        redirectUrl: this.resolveErrorRedirect(state, 'invalid_state'),
      };
    }

    if (payload.provider !== provider) {
      return {
        ok: false,
        redirectUrl: this.resolveErrorRedirect(state, 'invalid_provider'),
      };
    }

    if (payload.target === 'draft') {
      return this.handleDraftCallback(provider, payload, code);
    }

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: payload.proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      return {
        ok: false,
        redirectUrl: this.resolveErrorRedirect(state, 'proposal_not_found'),
      };
    }

    try {
      const resolved = await this.resolveOAuthPayload(provider, code);

      await this.prisma.$transaction(async (tx) => {
        await tx.socialAccount.deleteMany({
          where: { personId: proposal.person!.id, provider },
        });

        await tx.socialAccount.create({
          data: {
            personId: proposal.person!.id,
            provider,
            accessTokenEncrypted: resolved.accessTokenEncrypted,
            refreshTokenEncrypted: resolved.refreshTokenEncrypted,
            tokenMeta: resolved.meta as Prisma.InputJsonValue,
          },
        });

        await tx.auditLog.create({
          data: {
            proposalId: proposal.id,
            action: 'SOCIAL_CONNECT',
            entityType: 'Proposal',
            entityId: proposal.id,
            metadata: {
              provider,
              profile: sanitizeProfile(resolved.profile),
            } as Prisma.InputJsonValue,
          },
        });
      });

      return { ok: true, redirectUrl: this.buildSuccessRedirect(proposal) };
    } catch (error) {
      return {
        ok: false,
        redirectUrl: this.resolveErrorRedirect(state, 'oauth_failed'),
      };
    }
  }

  private async handleDraftCallback(
    provider: SocialProvider,
    payload: OAuthStateNormalized,
    code: string,
  ) {
    if (!payload.draftId) {
      return {
        ok: false,
        redirectUrl: this.buildDraftErrorRedirect('draft_not_found'),
      };
    }

    const draft = await this.prisma.draft.findUnique({
      where: { id: payload.draftId },
    });

    if (!draft || draft.expiresAt < new Date()) {
      return {
        ok: false,
        redirectUrl: this.buildDraftErrorRedirect('draft_not_found'),
      };
    }

    try {
      const resolved = await this.resolveOAuthPayload(provider, code);
      const nextData = this.buildDraftSocialData(
        (draft.data ?? {}) as Record<string, unknown>,
        provider,
        resolved,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.draft.update({
          where: { id: draft.id },
          data: { data: nextData as Prisma.InputJsonValue },
        });

        await tx.auditLog.create({
          data: {
            action: 'SOCIAL_CONNECT',
            entityType: 'Draft',
            entityId: draft.id,
            metadata: {
              provider,
              profile: sanitizeProfile(resolved.profile),
            } as Prisma.InputJsonValue,
          },
        });
      });

      return {
        ok: true,
        redirectUrl: this.buildDraftSuccessRedirect(draft.id, provider),
      };
    } catch (error) {
      return {
        ok: false,
        redirectUrl: this.buildDraftErrorRedirect('oauth_failed'),
      };
    }
  }

  private async resolveOAuthPayload(provider: SocialProvider, code: string) {
    const tokenResponse = await this.exchangeCode(provider, code);
    if (!tokenResponse.accessToken) {
      throw new Error('missing_access_token');
    }

    let profile: Record<string, unknown> | null = null;
    try {
      profile = await this.fetchProfile(provider, tokenResponse.accessToken);
    } catch (error) {
      profile = null;
    }

    const meta: Record<string, unknown> = {
      scope: tokenResponse.scope,
      tokenType: tokenResponse.tokenType,
      expiresAt: tokenResponse.expiresIn
        ? new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString()
        : null,
      fetchedAt: new Date().toISOString(),
      profile,
    };

    const accessTokenEncrypted = await this.crypto.encrypt(
      tokenResponse.accessToken,
    );
    const refreshTokenEncrypted = tokenResponse.refreshToken
      ? await this.crypto.encrypt(tokenResponse.refreshToken)
      : null;

    return {
      accessTokenEncrypted,
      refreshTokenEncrypted,
      meta,
      profile,
    };
  }

  private resolveErrorRedirect(state: string | undefined, reason: string) {
    if (!state) return this.buildErrorRedirect(reason);
    const payload = this.verifyState(state);
    if (payload?.target === 'draft') {
      return this.buildDraftErrorRedirect(reason, payload.draftId);
    }
    return this.buildErrorRedirect(reason);
  }

  private buildDraftSocialData(
    data: Record<string, unknown>,
    provider: SocialProvider,
    resolved: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted: string | null;
      meta: Record<string, unknown>;
      profile: Record<string, unknown> | null;
    },
  ) {
    const now = new Date().toISOString();
    const existingAuth = Array.isArray(data.socialAuth) ? data.socialAuth : [];
    const nextAuth = [
      ...existingAuth.filter((entry) => entry && entry.provider !== provider),
      {
        provider,
        accessTokenEncrypted: resolved.accessTokenEncrypted,
        refreshTokenEncrypted: resolved.refreshTokenEncrypted,
        tokenMeta: resolved.meta,
        connectedAt: now,
      },
    ];

    const existingConnections = Array.isArray(data.socialConnections)
      ? data.socialConnections
      : [];
    const nextConnections = [
      ...existingConnections.filter(
        (entry) => entry && entry.provider !== provider,
      ),
      {
        provider,
        connected: true,
        connectedAt: now,
      },
    ];

    return {
      ...data,
      socialAuth: nextAuth,
      socialConnections: nextConnections,
    };
  }

  async refreshProfileIfStale(
    accountId: string,
    maxAgeMs = 24 * 60 * 60 * 1000,
  ) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return null;

    const meta = account.tokenMeta as Record<string, unknown> | null;
    const fetchedAt = meta?.fetchedAt
      ? new Date(meta.fetchedAt as string).getTime()
      : 0;
    const age = Date.now() - fetchedAt;

    let accessToken = await this.crypto.decrypt(account.accessTokenEncrypted);
    let updatedMeta = { ...(meta ?? {}) };

    const refreshed = await this.refreshAccessTokenIfNeeded(
      account,
      updatedMeta,
      accessToken,
    );
    if (refreshed) {
      accessToken = refreshed.accessToken;
      updatedMeta = refreshed.meta;
    }

    if (age < maxAgeMs) {
      return updatedMeta.profile ?? null;
    }

    try {
      const profile = await this.fetchProfile(account.provider, accessToken);

      updatedMeta = {
        ...updatedMeta,
        profile,
        fetchedAt: new Date().toISOString(),
      };

      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: { tokenMeta: updatedMeta as any },
      });

      return profile;
    } catch {
      return updatedMeta.profile ?? null;
    }
  }

  async disconnect(
    providerRaw: string,
    input: {
      proposalId?: string;
      token?: string;
      draftId?: string;
      draftToken?: string;
    },
  ) {
    const provider = this.parseProvider(providerRaw);

    if (input.proposalId && input.token) {
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: { person: true },
      });

      if (
        !proposal ||
        !proposal.person ||
        proposal.publicToken !== input.token
      ) {
        throw new BadRequestException('Token invalido');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.socialAccount.deleteMany({
          where: { personId: proposal.person!.id, provider },
        });
        await tx.auditLog.create({
          data: {
            proposalId: proposal.id,
            action: 'SOCIAL_DISCONNECT',
            entityType: 'Proposal',
            entityId: proposal.id,
            metadata: { provider } as Prisma.InputJsonValue,
          },
        });
      });

      return { ok: true };
    }

    if (input.draftId && input.draftToken) {
      const draft = await this.getDraftOrThrow(input.draftId, input.draftToken);
      const current = (draft.data ?? {}) as Record<string, unknown>;
      const existingAuth = Array.isArray(current.socialAuth)
        ? current.socialAuth
        : [];
      const existingConnections = Array.isArray(current.socialConnections)
        ? current.socialConnections
        : [];

      const next = {
        ...current,
        socialAuth: existingAuth.filter(
          (entry) => entry && entry.provider !== provider,
        ),
        socialConnections: existingConnections.filter(
          (entry) => entry && entry.provider !== provider,
        ),
      };

      await this.prisma.$transaction(async (tx) => {
        await tx.draft.update({
          where: { id: draft.id },
          data: { data: next as Prisma.InputJsonValue },
        });
        await tx.auditLog.create({
          data: {
            action: 'SOCIAL_DISCONNECT',
            entityType: 'Draft',
            entityId: draft.id,
            metadata: { provider } as Prisma.InputJsonValue,
          },
        });
      });

      return { ok: true };
    }

    throw new BadRequestException('Parametros obrigatorios');
  }

  private async resolveTarget(input: {
    proposalId?: string;
    token?: string;
    draftId?: string;
    draftToken?: string;
  }) {
    if (input.proposalId && input.token) {
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: input.proposalId },
        select: { id: true, publicToken: true },
      });

      if (!proposal || proposal.publicToken !== input.token) {
        throw new BadRequestException('Token invalido');
      }

      return { type: 'proposal' as const, id: proposal.id };
    }

    if (input.draftId && input.draftToken) {
      const draft = await this.getDraftOrThrow(input.draftId, input.draftToken);
      return { type: 'draft' as const, id: draft.id };
    }

    throw new BadRequestException('Parametros obrigatorios');
  }

  private async getDraftOrThrow(draftId: string, token: string) {
    const draft = await this.prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new BadRequestException('Draft nao encontrado');
    }

    if (draft.expiresAt < new Date()) {
      throw new UnauthorizedException('Draft expirado');
    }

    if (draft.tokenHash !== this.hashToken(token)) {
      throw new UnauthorizedException('Token invalido');
    }

    return draft;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseProvider(value: string) {
    const normalized = value.trim().toUpperCase();
    if (normalized in SocialProvider) {
      return SocialProvider[normalized as keyof typeof SocialProvider];
    }
    throw new BadRequestException('Provider invalido');
  }

  private getProviderConfig(provider: SocialProvider): ProviderConfig {
    switch (provider) {
      case SocialProvider.SPOTIFY:
        return this.requireConfig({
          clientId: 'SPOTIFY_CLIENT_ID',
          clientSecret: 'SPOTIFY_CLIENT_SECRET',
          redirectUri: 'SPOTIFY_REDIRECT_URI',
          authUrl: 'https://accounts.spotify.com/authorize',
          tokenUrl: 'https://accounts.spotify.com/api/token',
          scopes: ['user-read-email', 'user-read-private', 'user-top-read'],
        });
      case SocialProvider.YOUTUBE:
        return this.requireConfig({
          clientId: 'YOUTUBE_CLIENT_ID',
          clientSecret: 'YOUTUBE_CLIENT_SECRET',
          redirectUri: 'YOUTUBE_REDIRECT_URI',
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scopes: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.force-ssl',
          ],
          authParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
          },
        });
      case SocialProvider.FACEBOOK:
        return this.requireConfig({
          clientId: 'FACEBOOK_APP_ID',
          clientSecret: 'FACEBOOK_APP_SECRET',
          redirectUri: 'FACEBOOK_REDIRECT_URI',
          authUrl: `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`,
          tokenUrl: `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`,
          scopes: [
            'public_profile',
            'pages_show_list',
            'pages_read_engagement',
          ],
          tokenMethod: 'GET',
        });
      case SocialProvider.INSTAGRAM:
        return this.requireConfig({
          clientId: 'INSTAGRAM_APP_ID',
          clientSecret: 'INSTAGRAM_APP_SECRET',
          redirectUri: 'INSTAGRAM_REDIRECT_URI',
          authUrl: 'https://api.instagram.com/oauth/authorize',
          tokenUrl: 'https://api.instagram.com/oauth/access_token',
          scopes: ['instagram_basic'],
        });
      default:
        throw new BadRequestException('Provider nao suportado');
    }
  }

  private requireConfig(input: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    authParams?: Record<string, string>;
    tokenMethod?: 'POST' | 'GET';
  }): ProviderConfig {
    const clientId = this.configService.get<string>(input.clientId, {
      infer: true,
    });
    const clientSecret = this.configService.get<string>(input.clientSecret, {
      infer: true,
    });
    const redirectUri = this.configService.get<string>(input.redirectUri, {
      infer: true,
    });

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Integracao nao configurada');
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      authUrl: input.authUrl,
      tokenUrl: input.tokenUrl,
      scopes: input.scopes,
      authParams: input.authParams,
      tokenMethod: input.tokenMethod,
    };
  }

  private signState(payload: OAuthStatePayload) {
    const secret = this.getStateSecret();
    const encoded = base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac('sha256', secret)
      .update(encoded)
      .digest('hex');
    return `${encoded}.${signature}`;
  }

  private verifyState(state: string): OAuthStateNormalized | null {
    const secret = this.getStateSecret();
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) return null;

    const expected = createHmac('sha256', secret).update(encoded).digest('hex');
    const signatureOk = safeCompare(signature, expected);
    if (!signatureOk) return null;

    let payload: OAuthStatePayload;
    try {
      const json = base64UrlDecode(encoded);
      payload = JSON.parse(json) as OAuthStatePayload;
    } catch (error) {
      return null;
    }
    if (payload.v !== 1 && payload.v !== 2) return null;

    const ttlMinutes =
      this.configService.get<number>('SOCIAL_STATE_TTL_MINUTES', {
        infer: true,
      }) ?? DEFAULT_STATE_TTL_MINUTES;
    const expiresAt = payload.issuedAt + ttlMinutes * 60 * 1000;
    if (Date.now() > expiresAt) return null;

    if (payload.v === 1) {
      return {
        provider: payload.provider,
        target: 'proposal',
        proposalId: payload.proposalId,
        issuedAt: payload.issuedAt,
      };
    }

    if (payload.target === 'draft' && payload.draftId) {
      return {
        provider: payload.provider,
        target: 'draft',
        draftId: payload.draftId,
        issuedAt: payload.issuedAt,
      };
    }

    if (payload.target === 'proposal' && payload.proposalId) {
      return {
        provider: payload.provider,
        target: 'proposal',
        proposalId: payload.proposalId,
        issuedAt: payload.issuedAt,
      };
    }

    return null;
  }

  private getStateSecret() {
    const secret = this.configService.get<string>('SOCIAL_OAUTH_STATE_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new BadRequestException(
        'SOCIAL_OAUTH_STATE_SECRET nao configurado',
      );
    }
    return secret;
  }

  private async exchangeCode(provider: SocialProvider, code: string) {
    const config = this.getProviderConfig(provider);

    if (provider === SocialProvider.SPOTIFY) {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      });
      const basic = Buffer.from(
        `${config.clientId}:${config.clientSecret}`,
      ).toString('base64');
      const payload = await fetchJson(config.tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresIn: payload.expires_in,
        scope: payload.scope,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    if (provider === SocialProvider.YOUTUBE) {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const payload = await fetchJson(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresIn: payload.expires_in,
        scope: payload.scope,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    if (provider === SocialProvider.FACEBOOK) {
      const url = new URL(config.tokenUrl);
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('client_secret', config.clientSecret);
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('code', code);

      const payload = await fetchJson(url.toString(), { method: 'GET' });

      return {
        accessToken: payload.access_token,
        expiresIn: payload.expires_in,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    if (provider === SocialProvider.INSTAGRAM) {
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code,
      });

      const payload = await fetchJson(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const longLived = await this.exchangeInstagramLongLived(
        payload.access_token,
        config.clientSecret,
      );

      return {
        accessToken: longLived?.access_token ?? payload.access_token,
        expiresIn: longLived?.expires_in ?? payload.expires_in,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    throw new BadRequestException('Provider nao suportado');
  }

  private async exchangeInstagramLongLived(
    accessToken: string,
    clientSecret: string,
  ) {
    const url = new URL('https://graph.instagram.com/access_token');
    url.searchParams.set('grant_type', 'ig_exchange_token');
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('access_token', accessToken);

    try {
      return (await fetchJson(url.toString(), { method: 'GET' })) as {
        access_token: string;
        expires_in: number;
      };
    } catch (error) {
      return null;
    }
  }

  private async fetchProfile(provider: SocialProvider, accessToken: string) {
    if (provider === SocialProvider.SPOTIFY) {
      const profile = await fetchJson('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let topTracks: Array<Record<string, unknown>> = [];
      try {
        const top = await fetchJson(
          'https://api.spotify.com/v1/me/top/tracks?limit=5',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        topTracks = Array.isArray(top.items)
          ? top.items.map((track: any) => ({
              id: track.id,
              name: track.name,
              popularity: track.popularity,
              artists: Array.isArray(track.artists)
                ? track.artists.map((artist: any) => artist.name)
                : [],
            }))
          : [];
      } catch (error) {
        topTracks = [];
      }

      return {
        id: profile.id,
        name: profile.display_name,
        email: profile.email,
        followers: profile.followers?.total,
        url: profile.external_urls?.spotify,
        topTracks,
      };
    }

    if (provider === SocialProvider.YOUTUBE) {
      const data = await fetchJson(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const item = Array.isArray(data.items) ? data.items[0] : null;

      return {
        id: item?.id,
        title: item?.snippet?.title,
        description: item?.snippet?.description,
        url: item?.snippet?.customUrl,
        subscribers: item?.statistics?.subscriberCount,
        views: item?.statistics?.viewCount,
        videos: item?.statistics?.videoCount,
      };
    }

    if (provider === SocialProvider.FACEBOOK) {
      const profile = await fetchJson(
        `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me?fields=id,name`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      let pages: Array<Record<string, unknown>> = [];
      try {
        const response = await fetchJson(
          `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts?fields=id,name,fan_count,followers_count`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        pages = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        pages = [];
      }

      return {
        id: profile.id,
        name: profile.name,
        pages,
      };
    }

    if (provider === SocialProvider.INSTAGRAM) {
      const url = new URL('https://graph.instagram.com/me');
      url.searchParams.set(
        'fields',
        'id,username,account_type,media_count,followers_count',
      );
      url.searchParams.set('access_token', accessToken);
      const profile = await fetchJson(url.toString(), { method: 'GET' });

      return {
        id: profile.id,
        username: profile.username,
        accountType: profile.account_type,
        followers: profile.followers_count,
        posts: profile.media_count,
        mediaCount: profile.media_count,
      };
    }

    return null;
  }

  private buildSuccessRedirect(proposal: {
    protocol: string;
    publicToken: string;
  }) {
    const explicit = this.configService.get<string>(
      'SOCIAL_REDIRECT_SUCCESS_URL',
      {
        infer: true,
      },
    );
    const base =
      explicit ??
      this.configService.get<string>('PUBLIC_TRACKING_BASE_URL', {
        infer: true,
      });

    if (!base) {
      return `/acompanhar?protocolo=${encodeURIComponent(
        proposal.protocol,
      )}&protocol=${encodeURIComponent(
        proposal.protocol,
      )}&token=${encodeURIComponent(proposal.publicToken)}`;
    }

    const url = new URL(base);
    url.searchParams.set('protocolo', proposal.protocol);
    url.searchParams.set('protocol', proposal.protocol);
    url.searchParams.set('token', proposal.publicToken);
    return url.toString();
  }

  private buildDraftSuccessRedirect(draftId: string, provider: SocialProvider) {
    const explicit = this.configService.get<string>(
      'SOCIAL_REDIRECT_DRAFT_SUCCESS_URL',
      {
        infer: true,
      },
    );

    const base =
      explicit ??
      this.configService.get<string>('PUBLIC_CADASTRO_BASE_URL', {
        infer: true,
      });

    if (!base) {
      return `/cadastro?social=success&provider=${encodeURIComponent(
        provider,
      )}&draftId=${encodeURIComponent(draftId)}`;
    }

    const url = new URL(base);
    url.searchParams.set('social', 'success');
    url.searchParams.set('provider', provider);
    url.searchParams.set('draftId', draftId);
    return url.toString();
  }

  private buildErrorRedirect(reason: string) {
    const base = this.configService.get<string>('SOCIAL_REDIRECT_ERROR_URL', {
      infer: true,
    });
    if (!base) return `/acompanhar?erro=${encodeURIComponent(reason)}`;

    const url = new URL(base);
    url.searchParams.set('erro', reason);
    return url.toString();
  }

  private buildDraftErrorRedirect(reason: string, draftId?: string) {
    const base = this.configService.get<string>(
      'SOCIAL_REDIRECT_DRAFT_ERROR_URL',
      {
        infer: true,
      },
    );
    if (!base) {
      const params = new URLSearchParams({ social: 'error', erro: reason });
      if (draftId) params.set('draftId', draftId);
      return `/cadastro?${params.toString()}`;
    }

    const url = new URL(base);
    url.searchParams.set('social', 'error');
    url.searchParams.set('erro', reason);
    if (draftId) url.searchParams.set('draftId', draftId);
    return url.toString();
  }

  private async refreshAccessTokenIfNeeded(
    account: {
      id: string;
      provider: SocialProvider;
      refreshTokenEncrypted?: string | null;
    },
    meta: Record<string, unknown>,
    accessToken: string,
  ) {
    const expiresAt = meta.expiresAt
      ? new Date(meta.expiresAt as string).getTime()
      : 0;
    if (!expiresAt) return null;

    const thresholdMinutes =
      this.configService.get<number>('SOCIAL_TOKEN_REFRESH_THRESHOLD_MINUTES', {
        infer: true,
      }) ?? 10;
    const thresholdMs = Math.max(1, thresholdMinutes) * 60 * 1000;
    if (expiresAt - Date.now() > thresholdMs) return null;

    const refreshed = await this.refreshAccessToken(
      account.provider,
      accessToken,
      account.refreshTokenEncrypted,
    );
    if (!refreshed?.accessToken) return null;

    const accessTokenEncrypted = await this.crypto.encrypt(
      refreshed.accessToken,
    );
    const refreshTokenEncrypted = refreshed.refreshToken
      ? await this.crypto.encrypt(refreshed.refreshToken)
      : (account.refreshTokenEncrypted ?? null);

    const updatedMeta = {
      ...meta,
      tokenType: refreshed.tokenType ?? meta.tokenType,
      scope: refreshed.scope ?? meta.scope,
      expiresAt: refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
        : meta.expiresAt,
      refreshedAt: new Date().toISOString(),
    };

    await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenMeta: updatedMeta as any,
      },
    });

    return { accessToken: refreshed.accessToken, meta: updatedMeta };
  }

  private async refreshAccessToken(
    provider: SocialProvider,
    accessToken: string,
    refreshTokenEncrypted?: string | null,
  ) {
    if (provider === SocialProvider.SPOTIFY) {
      if (!refreshTokenEncrypted) return null;
      const config = this.getProviderConfig(provider);
      const refreshToken = await this.crypto.decrypt(refreshTokenEncrypted);
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      const basic = Buffer.from(
        `${config.clientId}:${config.clientSecret}`,
      ).toString('base64');
      const payload = await fetchJson(config.tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresIn: payload.expires_in,
        scope: payload.scope,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    if (provider === SocialProvider.YOUTUBE) {
      if (!refreshTokenEncrypted) return null;
      const config = this.getProviderConfig(provider);
      const refreshToken = await this.crypto.decrypt(refreshTokenEncrypted);
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });
      const payload = await fetchJson(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return {
        accessToken: payload.access_token,
        expiresIn: payload.expires_in,
        scope: payload.scope,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    if (provider === SocialProvider.FACEBOOK) {
      const config = this.getProviderConfig(provider);
      const url = new URL(
        `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`,
      );
      url.searchParams.set('grant_type', 'fb_exchange_token');
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('client_secret', config.clientSecret);
      url.searchParams.set('fb_exchange_token', accessToken);
      const payload = await fetchJson(url.toString(), { method: 'GET' });
      return {
        accessToken: payload.access_token,
        expiresIn: payload.expires_in,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    if (provider === SocialProvider.INSTAGRAM) {
      const url = new URL('https://graph.instagram.com/refresh_access_token');
      url.searchParams.set('grant_type', 'ig_refresh_token');
      url.searchParams.set('access_token', accessToken);
      const payload = await fetchJson(url.toString(), { method: 'GET' });
      return {
        accessToken: payload.access_token,
        expiresIn: payload.expires_in,
        tokenType: payload.token_type,
      } as OAuthTokenResponse;
    }

    return null;
  }
}

const base64UrlEncode = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64url');

const base64UrlDecode = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

const safeCompare = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
};

const sanitizeProfile = (profile: unknown) => {
  if (!profile || typeof profile !== 'object') return null;
  const allowedKeys = [
    'id',
    'name',
    'username',
    'title',
    'followers',
    'subscribers',
    'views',
    'videos',
    'posts',
    'mediaCount',
  ];
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in profile) {
      result[key] = (profile as Record<string, unknown>)[key];
    }
  }
  return result;
};

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }

  if (!response.ok) {
    throw new Error(text || response.statusText || 'OAuth request failed');
  }

  return json ?? {};
};
