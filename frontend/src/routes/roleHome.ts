import type { Role } from "../types";

export function dashboardHome(role: Role): string {
  switch (role) {
    case "CUSTOMER":
      return "/customer";
    case "SELLER":
      return "/seller";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
