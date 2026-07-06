import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";
import SignInPage from "@/app/(auth)/sign-in/page";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import DashboardPoolsPage from "@/app/(dashboard)/dashboard/pools/page";
import NewPoolPage from "@/app/(dashboard)/dashboard/pools/new/page";
import TemplatesPage from "@/app/(dashboard)/dashboard/templates/page";
import UploadYourOwnPage from "@/app/upload-your-own/page";

describe("route smoke tests", () => {
  it.each([
    ["home", () => HomePage()],
    ["dashboard", () => DashboardPage()],
    ["dashboard pools", () => DashboardPoolsPage()],
    ["new pool", () => NewPoolPage()],
    ["templates", () => TemplatesPage()],
    ["upload your own", () => UploadYourOwnPage()],
  ])("%s page exports a valid React element", async (_name, renderPage) => {
    const element = await Promise.resolve(renderPage());

    expect(isValidElement(element)).toBe(true);
  });

  it("sign-in page resolves search params and exports a valid React element", async () => {
    const element = await SignInPage({
      searchParams: Promise.resolve({ next: "/dashboard" }),
    });

    expect(isValidElement(element)).toBe(true);
  });
});
