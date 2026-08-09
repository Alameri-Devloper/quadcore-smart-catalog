export const parseIdentityCliArguments = (argv: readonly string[]): ReadonlyMap<string, string> => {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (!argument.startsWith("--")) throw new Error("CliArgumentInvalid");
    const separator = argument.indexOf("=");
    if (separator > 2) {
      values.set(argument.slice(2, separator), argument.slice(separator + 1));
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error("CliArgumentInvalid");
    values.set(argument.slice(2), next);
    index += 1;
  }
  for (const forbidden of ["password", "temporary-password", "new-password"]) {
    if (values.has(forbidden)) throw new Error("PasswordArgumentForbidden");
  }
  return values;
};
