import type { Role } from "../types";

export function dashboardHome(role: Role): string {
  switch (role) {
    case "CUSTOMER":
      return "/customer";
    case "SELLER":
      return "/seller";
    case "CAFE_OWNER":
      return "/cafe-owner";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
