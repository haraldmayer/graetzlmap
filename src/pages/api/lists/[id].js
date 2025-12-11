import fs from 'fs';
import path from 'path';

const LISTS_FILE = path.join(process.cwd(), 'public', 'data', 'lists.json');

// GET /api/lists/[id] - Get single list
export async function GET({ params }) {
  try {
    const { id } = params;
    const content = fs.readFileSync(LISTS_FILE, 'utf8');
    const data = JSON.parse(content);

    const list = data.lists.find(l => l.id === id);

    if (!list) {
      return new Response(JSON.stringify({ error: 'List not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify(list), {
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

// PUT /api/lists/[id] - Update list
export async function PUT({ params, request }) {
  try {
    const { id } = params;
    const updatedList = await request.json();

    const content = fs.readFileSync(LISTS_FILE, 'utf8');
    const data = JSON.parse(content);

    const index = data.lists.findIndex(l => l.id === id);

    if (index === -1) {
      return new Response(JSON.stringify({ error: 'List not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Preserve ID
    updatedList.id = id;
    data.lists[index] = updatedList;

    fs.writeFileSync(LISTS_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, list: updatedList }), {
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

// DELETE /api/lists/[id] - Delete list
export async function DELETE({ params }) {
  try {
    const { id } = params;
    const content = fs.readFileSync(LISTS_FILE, 'utf8');
    const data = JSON.parse(content);

    const index = data.lists.findIndex(l => l.id === id);

    if (index === -1) {
      return new Response(JSON.stringify({ error: 'List not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    data.lists.splice(index, 1);
    fs.writeFileSync(LISTS_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true }), {
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
