import fs from 'fs';
import path from 'path';

const WALKTHROUGHS_FILE = path.join(process.cwd(), 'public', 'data', 'walkthroughs.json');

// GET /api/walkthroughs/[id] - Get single walkthrough
export async function GET({ params }) {
  try {
    const { id } = params;
    const content = fs.readFileSync(WALKTHROUGHS_FILE, 'utf8');
    const data = JSON.parse(content);

    const walkthrough = data.walkthroughs.find(w => w.id === id);

    if (!walkthrough) {
      return new Response(JSON.stringify({ error: 'Walkthrough not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify(walkthrough), {
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

// PUT /api/walkthroughs/[id] - Update walkthrough
export async function PUT({ params, request }) {
  try {
    const { id } = params;
    const updatedWalkthrough = await request.json();

    const content = fs.readFileSync(WALKTHROUGHS_FILE, 'utf8');
    const data = JSON.parse(content);

    const index = data.walkthroughs.findIndex(w => w.id === id);

    if (index === -1) {
      return new Response(JSON.stringify({ error: 'Walkthrough not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Preserve ID
    updatedWalkthrough.id = id;
    data.walkthroughs[index] = updatedWalkthrough;

    fs.writeFileSync(WALKTHROUGHS_FILE, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, walkthrough: updatedWalkthrough }), {
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

// DELETE /api/walkthroughs/[id] - Delete walkthrough
export async function DELETE({ params }) {
  try {
    const { id } = params;
    const content = fs.readFileSync(WALKTHROUGHS_FILE, 'utf8');
    const data = JSON.parse(content);

    const index = data.walkthroughs.findIndex(w => w.id === id);

    if (index === -1) {
      return new Response(JSON.stringify({ error: 'Walkthrough not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    data.walkthroughs.splice(index, 1);
    fs.writeFileSync(WALKTHROUGHS_FILE, JSON.stringify(data, null, 2));

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
