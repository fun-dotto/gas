interface FormResponse {
  response: GoogleAppsScript.Forms.FormResponse;
}

interface NotionPayload {
  parent: { database_id: string };
  properties: {
    件名: { title: Array<{ text: { content: string } }> };
    ステータス: { status: { name: string } };
    種類: { select: { name: string } };
    メールアドレス: { email: string | null };
    要望内容: { rich_text: Array<{ text: { content: string } }> };
    プラットフォーム: { select: { name: string } | null };
    アプリバージョン: { rich_text: Array<{ text: { content: string } }> };
    バグ詳細: { rich_text: Array<{ text: { content: string } }> };
    送信日時: { rich_text: Array<{ text: { content: string } }> };
  };
}

interface SlackAttachment {
  color: string;
  title: string;
  title_link: string;
  fields: Array<{ title: string; value: string; short?: boolean }>;
  footer: string;
  ts: number;
}

interface SlackPayload {
  text: string;
  attachments: SlackAttachment[];
}

function syncToNotion(e: FormResponse): void {
  // --- 1. スクリプトプロパティから設定を取得 ---
  const props = PropertiesService.getScriptProperties();
  const NOTION_API_TOKEN = props.getProperty("NOTION_API_TOKEN");
  const DATABASE_ID = props.getProperty("DATABASE_ID");
  const SLACK_WEBHOOK_URL = props.getProperty("SLACK_WEBHOOK_URL");
  const FORM_ID = props.getProperty("FORM_ID");

  if (!NOTION_API_TOKEN || !DATABASE_ID || !FORM_ID) {
    throw new Error("必須の環境変数が設定されていません");
  }

  // --- 2. フォームの回答内容を取得 ---
  const itemResponses = e.response.getItemResponses();
  const email = e.response.getRespondentEmail();
  const timestamp = e.response.getTimestamp();

  let type = "";
  let request = "";
  let platform = "";
  let appVersion = "";
  let bugDetail = "";

  for (let i = 0; i < itemResponses.length; i++) {
    const title = itemResponses[i].getItem().getTitle();
    const response = itemResponses[i].getResponse();
    const responseText = Array.isArray(response)
      ? response.join(", ")
      : String(response);

    if (title.includes("種類")) type = responseText;
    else if (
      title.includes("Dottoで知りたい情報・出来るようになってほしいこと")
    )
      request = responseText;
    else if (title.includes("プラットフォーム")) platform = responseText;
    else if (title.includes("アプリバージョン")) appVersion = responseText;
    else if (title.includes("バグの詳細")) bugDetail = responseText;
  }

  // 件名の構築
  const pageTitle =
    type === "バグ報告"
      ? `[バグ] ${platform || "不明"} / ${appVersion || "不明"}`
      : `[要望] ${Utilities.formatDate(timestamp, "JST", "yyyy-MM-dd HH:mm")}`;

  // --- 3. Notion API 送信 ---
  const notionUrl = "https://api.notion.com/v1/pages";
  const notionPayload: NotionPayload = {
    parent: { database_id: DATABASE_ID },
    properties: {
      件名: { title: [{ text: { content: pageTitle } }] },
      ステータス: { status: { name: "未分類" } },
      種類: { select: { name: type || "未分類" } },
      メールアドレス: { email: email || null },
      要望内容: { rich_text: [{ text: { content: request || "" } }] },
      プラットフォーム: { select: platform ? { name: platform } : null },
      アプリバージョン: {
        rich_text: [{ text: { content: appVersion || "" } }],
      },
      バグ詳細: { rich_text: [{ text: { content: bugDetail || "" } }] },
      送信日時: {
        rich_text: [
          {
            text: {
              content: Utilities.formatDate(
                timestamp,
                "JST",
                "yyyy-MM-dd HH:mm:ss",
              ),
            },
          },
        ],
      },
    },
  };

  const notionOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    headers: {
      Authorization: "Bearer " + NOTION_API_TOKEN,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    payload: JSON.stringify(notionPayload),
    muteHttpExceptions: true,
  };

  const notionResponse = UrlFetchApp.fetch(notionUrl, notionOptions);
  const resData = JSON.parse(notionResponse.getContentText());
  const notionPageUrl: string =
    resData.url || `https://www.notion.so/${DATABASE_ID.replace(/-/g, "")}`;

  // --- 4. Slack 通知送信 ---
  if (SLACK_WEBHOOK_URL) {
    const slackPayload: SlackPayload = {
      text: "📢 *新しいフィードバックが届きました！*",
      attachments: [
        {
          color: type === "バグ報告" ? "#ed4245" : "#3498db",
          title: pageTitle,
          title_link: notionPageUrl,
          fields: [
            { title: "種類", value: type || "なし", short: true },
            {
              title: "プラットフォーム",
              value: platform || "なし",
              short: true,
            },
            { title: "アプリVer", value: appVersion || "なし", short: true },
            {
              title: "詳細・内容",
              value: (request || bugDetail || "なし").substring(0, 500),
            },
          ],
          footer: "Dotto Feedback System",
          ts: Math.floor(timestamp.getTime() / 1000),
        },
      ],
    };

    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(slackPayload),
      muteHttpExceptions: true,
    });
  }
}
