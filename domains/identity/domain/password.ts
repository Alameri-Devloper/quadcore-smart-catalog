export const PASSWORD_MIN_CHARACTERS = 12;
export const PASSWORD_MAX_CHARACTERS = 128;

export class PasswordHash {
  private constructor(readonly value: string) {}

  static rehydrate(value: string): PasswordHash {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("PasswordHashInvalid");
    }
    return Object.freeze(new PasswordHash(value));
  }
}

export const validatePassword = (password: string): void => {
  if (typeof password !== "string") throw new Error("PasswordInvalid");
  const characterCount = Array.from(password).length;
  if (
    characterCount < PASSWORD_MIN_CHARACTERS
    || characterCount > PASSWORD_MAX_CHARACTERS
    || /^\s+$/u.test(password)
  ) {
    throw new Error("PasswordInvalid");
  }
};
