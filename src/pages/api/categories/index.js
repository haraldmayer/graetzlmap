import fs from 'fs';
import path from 'path';

const CATEGORIES_FILE = path.join(process.cwd(), 'public', 'data', 'categories.json');

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const content = fs.readFileSync(CATEGORIES_FILE, 'utf8');
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

// POST /api/categories - Add new category
export async function POST({ request }) {
  try {
    const { key, name } = await request.json();

    if (!key || !name) {
      return new Response(JSON.stringify({ error: 'Category key and name are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Read current categories
    const content = fs.readFileSync(CATEGORIES_FILE, 'utf8');
    const data = JSON.parse(content);

    // Check if category already exists
    if (data.categories[key]) {
      return new Response(JSON.stringify({ error: 'Category already exists', category: data.categories[key] }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Add new category with default values
    data.categories[key] = {
      name: name,
      emoji: '📍',
      icon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='3'/></svg>",
      color: '#6B7280'
    };

    // Save back to file
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, category: data.categories[key] }), {
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
