export default function handler(req: any, res: any) {
    const { img, prompt } = req.query;

    if (!img) {
        res.statusCode = 400;
        return res.end('Missing image URL');
    }

    // Construct the mini app embed JSON
    const embed = {
        version: "1",
        imageUrl: img, // The image to display in the feed
        button: {
            title: "Play ChainCanvas",
            action: {
                type: "launch_frame",
                name: "ChainCanvas",
                url: "https://chaincanvas-xi.vercel.app/", // Main app URL
                splashImageUrl: "https://chaincanvas-xi.vercel.app/logo.png", // Replace with actual logo if available
                splashBackgroundColor: "#000000"
            }
        }
    };

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="ChainCanvas Turn" />
        <meta property="og:image" content="${img}" />
        <meta name="fc:frame" content='${JSON.stringify(embed)}' />
        <meta name="fc:miniapp" content='${JSON.stringify(embed)}' />
      </head>
      <body>
        <h1>ChainCanvas Turn</h1>
        <img src="${img}" alt="Turn Image" style="max-width: 100%;" />
        <p>Prompt: ${prompt || 'Unknown'}</p>
      </body>
    </html>
  `;

    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}
