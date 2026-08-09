const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,64}$/;

export class Username {
  private constructor(
    readonly value: string,
    readonly normalizedValue: string,
  ) {}

  static create(value: string): Username {
    if (typeof value !== "string" || !USERNAME_PATTERN.test(value)) {
      throw new Error("UsernameInvalid");
    }
    return Object.freeze(new Username(value, value.toLowerCase()));
  }
}
