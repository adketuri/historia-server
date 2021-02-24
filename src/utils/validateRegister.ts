import { UsernamePasswordInput } from "src/UsernamePasswordInput";

export function validateRegister(options: UsernamePasswordInput) {
  // Validate username/password length
  let errors = [];
  if (options.username.length <= 2) {
    errors.push({
      field: "username",
      message: "Username must be at least 3 characters.",
    });
  }
  if (options.username.includes("@")) {
    errors.push({
      field: "username",
      message: "Username must not include an @ sign.",
    });
  }
  if (options.password.length <= 2) {
    errors.push({
      field: "password",
      message: "Password must be at least 3 characters.",
    });
  }
  if (!options.email.includes("@")) {
    errors.push({
      field: "email",
      message: "Email must be valid.",
    });
  }
  console.log("Register validation:", errors);
  if (errors.length > 0) {
    return errors;
  }
  return null;
}
