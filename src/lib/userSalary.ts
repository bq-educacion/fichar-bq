import crypto from "crypto";

const SALARY_ENCRYPTION_PREFIX = "enc:v1";
const SALARY_KEY_BYTES = 32;
const SALARY_IV_BYTES = 12;
const SALARY_ALGORITHM = "aes-256-gcm";
const SALARY_DECRYPTION_AUTH_ERROR_PATTERN =
  /unsupported state|unable to authenticate data/i;
const salaryConfigurationErrorMessages = new Set([
  "USER_SALARY_ENCRYPTION_KEY is not defined",
  "USER_SALARY_ENCRYPTION_KEY must be a 32-byte base64 value or a 64-character hex value",
]);
const salaryDataErrorMessages = new Set([
  "Invalid encrypted salary payload",
  "Invalid encrypted salary history entry",
  "Invalid salary init date",
]);

export type SalaryHistoryEntry = {
  initDate: Date;
  salary: number;
};

type SalaryHistoryStorageEntry = {
  initDate?: unknown;
  valueEncrypted?: unknown;
  get?: (path: string) => unknown;
};

type SalaryDocumentLike = {
  salaryHistory?: SalaryHistoryStorageEntry[];
  get?: (path: string) => unknown;
  set?: (path: string, value: unknown) => unknown;
};

const assertValidSalaryValue = (salary: number): number => {
  if (!Number.isFinite(salary) || salary < 0) {
    throw new Error("Salary must be a non-negative finite number");
  }

  return salary;
};

const normalizeSalaryInitDate = (value: unknown): Date => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid salary init date");
    }

    return new Date(value.getTime());
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("Invalid salary init date");
    }

    return parsedDate;
  }

  throw new Error("Invalid salary init date");
};

const getSalaryEncryptionKey = (): Buffer => {
  const rawKey = process.env.USER_SALARY_ENCRYPTION_KEY?.trim();
  if (!rawKey) {
    throw new Error("USER_SALARY_ENCRYPTION_KEY is not defined");
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  const decodedKey = Buffer.from(rawKey, "base64");
  if (decodedKey.length !== SALARY_KEY_BYTES) {
    throw new Error(
      "USER_SALARY_ENCRYPTION_KEY must be a 32-byte base64 value or a 64-character hex value"
    );
  }

  return decodedKey;
};

export const encryptSalary = (salary: number): string => {
  const normalizedSalary = assertValidSalaryValue(salary);
  const iv = crypto.randomBytes(SALARY_IV_BYTES);
  const cipher = crypto.createCipheriv(
    SALARY_ALGORITHM,
    getSalaryEncryptionKey(),
    iv
  );
  const ciphertext = Buffer.concat([
    cipher.update(String(normalizedSalary), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SALARY_ENCRYPTION_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
};

export const decryptSalary = (encryptedSalary: string): number => {
  const parts = encryptedSalary.split(":");
  const prefix = parts.slice(0, 2).join(":");
  const [ivBase64, authTagBase64, ciphertextBase64] = parts.slice(2);

  if (
    parts.length !== 5 ||
    prefix !== SALARY_ENCRYPTION_PREFIX ||
    !ivBase64 ||
    !authTagBase64 ||
    !ciphertextBase64
  ) {
    throw new Error("Invalid encrypted salary payload");
  }

  const decipher = crypto.createDecipheriv(
    SALARY_ALGORITHM,
    getSalaryEncryptionKey(),
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const salary = Number(decrypted);

  return assertValidSalaryValue(salary);
};

export const getSalaryOperationErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  if (salaryConfigurationErrorMessages.has(error.message)) {
    return "Salary encryption is not configured correctly on the server";
  }

  if (salaryDataErrorMessages.has(error.message)) {
    return "Stored salary data is invalid";
  }

  if (SALARY_DECRYPTION_AUTH_ERROR_PATTERN.test(error.message)) {
    return "Stored salary data cannot be decrypted with the current server configuration";
  }

  return null;
};

const getRawSalaryHistory = (user: SalaryDocumentLike): SalaryHistoryStorageEntry[] => {
  const salaryHistory =
    typeof user.get === "function" ? user.get("salaryHistory") : user.salaryHistory;

  return Array.isArray(salaryHistory) ? salaryHistory : [];
};

const getStoredSalaryHistory = (
  user: SalaryDocumentLike,
): Array<{ initDate: Date; valueEncrypted: string }> =>
  getRawSalaryHistory(user).map((entry) => {
    const initDate =
      typeof entry.get === "function" ? entry.get("initDate") : entry.initDate;
    const valueEncrypted =
      typeof entry.get === "function"
        ? entry.get("valueEncrypted")
        : entry.valueEncrypted;

    if (typeof valueEncrypted !== "string" || valueEncrypted.length === 0) {
      throw new Error("Invalid encrypted salary history entry");
    }

    return {
      initDate: normalizeSalaryInitDate(initDate),
      valueEncrypted,
    };
  });

export const getSalaryHistoryFromUser = (
  user: SalaryDocumentLike
): SalaryHistoryEntry[] =>
  getStoredSalaryHistory(user).map((entry) => ({
    initDate: entry.initDate,
    salary: decryptSalary(entry.valueEncrypted),
  }));

export const getCurrentSalaryEntryFromUser = (
  user: SalaryDocumentLike
): SalaryHistoryEntry | null => {
  const salaryHistory = getSalaryHistoryFromUser(user);
  return salaryHistory.length > 0 ? salaryHistory[salaryHistory.length - 1] : null;
};

export const getSalaryFromUser = (user: SalaryDocumentLike): number | null =>
  getCurrentSalaryEntryFromUser(user)?.salary ?? null;

export const appendSalaryToUserHistory = (
  user: SalaryDocumentLike,
  salary: number,
  initDate: Date | string | number
): boolean => {
  const normalizedSalary = assertValidSalaryValue(salary);
  const normalizedInitDate = normalizeSalaryInitDate(initDate);
  const existingHistory = getStoredSalaryHistory(user);
  const currentEntry =
    existingHistory.length > 0
      ? existingHistory[existingHistory.length - 1]
      : undefined;

  if (currentEntry && decryptSalary(currentEntry.valueEncrypted) === normalizedSalary) {
    return false;
  }

  const nextHistory = [
    ...existingHistory,
    {
      initDate: normalizedInitDate,
      valueEncrypted: encryptSalary(normalizedSalary),
    },
  ];

  if (typeof user.set === "function") {
    user.set("salaryHistory", nextHistory);
    return true;
  }

  user.salaryHistory = nextHistory;
  return true;
};
