import fs from 'fs';
import path from 'path';

const LISTS_FILE = path.join(process.cwd(), 'public', 'data', 'lists.json');

// Ensure lists file exists
if (!fs.existsSync(LISTS_FILE)) {
  fs.writeFileSync(LISTS_FILE, JSON.stringify({ lists: [] }, null, 2));
}

// GET /api/lists - List all lists
export async function GET() {
  try {
    const content = fs.readFileSync(LISTS_FILE, 'utf8');
    const data = JSON.parse(content);

    return new Response(JSON.stringify(data.lists), {
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

// POST /api/lists - Create new list
export async function POST({ request }) {
  try {
    const list = await request.json();

    // Generate unique ID
    const id = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    list.id = id;

    // Read current lists
    const content = fs.readFileSync(LISTS_FILE, 'utf8');
    const data = JSON.parse(content);

    // Add new list
    data.lists.push(list);

    // Save back to file
    fs.writeFileSync(LISTS_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, id, list }), {
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
