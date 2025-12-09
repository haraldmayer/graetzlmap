import fs from 'fs';
import path from 'path';

const WALKTHROUGHS_FILE = path.join(process.cwd(), 'public', 'data', 'walkthroughs.json');

// Ensure walkthroughs file exists
if (!fs.existsSync(WALKTHROUGHS_FILE)) {
  fs.writeFileSync(WALKTHROUGHS_FILE, JSON.stringify({ walkthroughs: [] }, null, 2));
}

// GET /api/walkthroughs - List all walkthroughs
export async function GET() {
  try {
    const content = fs.readFileSync(WALKTHROUGHS_FILE, 'utf8');
    const data = JSON.parse(content);

    return new Response(JSON.stringify(data.walkthroughs), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// POST /api/walkthroughs - Create new walkthrough
export async function POST({ request }) {
  try {
    const walkthrough = await request.json();

    // Generate unique ID
    const id = `walk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    walkthrough.id = id;

    // Read current walkthroughs
    const content = fs.readFileSync(WALKTHROUGHS_FILE, 'utf8');
    const data = JSON.parse(content);

    // Add new walkthrough
    data.walkthroughs.push(walkthrough);

    // Save back to file
    fs.writeFileSync(WALKTHROUGHS_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, id, walkthrough }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
