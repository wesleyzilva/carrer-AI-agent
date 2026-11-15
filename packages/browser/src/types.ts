import type { ApplyMode, SiteId } from "@career/config";
import type { BlockReason } from "@career/db";
import type { Page } from "playwright";
import type { Recorder } from "./recorder.js";
import type { CanonicalProfile } from "./canonicalProfile.js";

export type { ApplyMode, SiteId };

export interface Credentials {
  email: string;
  password: string;
}

export interface AdapterContext {
  page: Page;
  rec: Recorder;
  mode: ApplyMode;
  creds: Credentials | null;
}

/** Um campo do perfil na plataforma, com o valor atual lido e o desejado. */
export interface ProfileFieldDiff {
  field: keyof CanonicalProfile;
  current: string | null;
  desired: string;
  changed: boolean;
}

export interface LoginResult {
  ok: boolean;
  alreadyLoggedIn: boolean;
  blocked?: BlockReason | undefined;
}

export interface SignupResult {
  ok: boolean;
  /** true quando parou esperando OTP/captcha/confirmação de e-mail. */
  waitingHuman: boolean;
  blocked?: BlockReason | undefined;
}

export interface SyncResult {
  diffs: ProfileFieldDiff[];
  applied: number;
  skipped: number;
  blocked?: BlockReason | undefined;
}

export interface PlatformAdapter {
  site: SiteId;
  urls: { login: string; signup: string; profile: string };
  /** Detecta se a sessão já está autenticada (cookies persistentes). */
  isLoggedIn(ctx: AdapterContext): Promise<boolean>;
  login(ctx: AdapterContext): Promise<LoginResult>;
  /** Cadastro do zero. Sempre para em OTP/captcha/confirmação (WAITING_HUMAN). */
  signup(ctx: AdapterContext, profile: CanonicalProfile): Promise<SignupResult>;
  /** Lê o perfil atual, compara com o canônico e aplica (se mode permitir). */
  syncProfile(ctx: AdapterContext, profile: CanonicalProfile): Promise<SyncResult>;
}
