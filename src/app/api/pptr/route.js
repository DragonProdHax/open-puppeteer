import chromium from "@sparticuz/chromium-min";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";

export const dynamic = "force-dynamic";

const remoteExecutablePath =
  "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

let browser;

async function getBrowser() {
  if (browser) return browser;

  if (process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT === "production") {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(remoteExecutablePath),
      headless: true,
    });
  } else {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
  }
  return browser;
}

async function checkPageStatus(url) {
  let statusCode;
  let pageTitle = null;

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });

    // Check the page status
    statusCode = response && response.status() === 200 ? 200 : 404;

    // Get the page title using querySelector
    if (statusCode === 200) {
      pageTitle = await page.evaluate(() => {
        const titleElement = document.querySelector("body > div > h1");
        return titleElement ? titleElement.innerText : null;
      });
    }

    await page.close();
  } catch (error) {
    console.error("Error accessing page:", error);
    statusCode = 404;
  }

  return { statusCode, pageTitle };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response(
      JSON.stringify({ error: "URL parameter is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { statusCode, pageTitle } = await checkPageStatus(url);
  
  return new Response(
    JSON.stringify({
      statusCode,
      is200: statusCode === 200,
      title: pageTitle,
    }),
    {
      status: statusCode === 200 ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    }
  );
}
