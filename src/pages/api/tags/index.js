import fs from 'fs';
import path from 'path';

const TAGS_FILE = path.join(process.cwd(), 'public', 'data', 'tags.json');

// Ensure tags file exists
if (!fs.existsSync(TAGS_FILE)) {
  fs.writeFileSync(TAGS_FILE, JSON.stringify({ tags: {} }, null, 2));
}

// GET /api/tags - Get all tags
export async function GET() {
  try {
    const content = fs.readFileSync(TAGS_FILE, 'utf8');
    const data = JSON.parse(content);

    return new Response(JSON.stringify(data), {
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

// POST /api/tags - Add new tag
export async function POST({ request }) {
  try {
    const { key, name } = await request.json();

    if (!key || !name) {
      return new Response(JSON.stringify({ error: 'Tag key and name are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Read current tags
    const content = fs.readFileSync(TAGS_FILE, 'utf8');
    const data = JSON.parse(content);

    // Check if tag already exists
    if (data.tags[key]) {
      return new Response(JSON.stringify({ exists: true, tag: data.tags[key] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Add new tag
    data.tags[key] = {
      name: name,
      count: 0
    };

    // Save back to file
    fs.writeFileSync(TAGS_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, tag: data.tags[key] }), {
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
