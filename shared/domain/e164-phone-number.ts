const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export class E164PhoneNumber {
  private constructor(readonly value: string) {}

  static create(value: string): E164PhoneNumber {
    if (!E164_PATTERN.test(value)) {
      throw new Error("PhoneNumberInvalid");
    }
    return Object.freeze(new E164PhoneNumber(value));
  }
}
