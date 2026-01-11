import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const html = await response.text();

    // タイトルの抽出
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : url;

    // OG画像の抽出
    const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    const ogImage = ogImageMatch ? ogImageMatch[1] : null;

    return NextResponse.json({ title, ogImage });
  } catch (error) {
    return NextResponse.json({ title: url, ogImage: null });
  }
}