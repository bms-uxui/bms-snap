function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Content-Type': 'application/json',
  }
}

async function handleAIProxy(request, env) {
  const { bulletPoints, projectName, userName, userRole } = await request.json()

  if (!bulletPoints || !bulletPoints.trim()) {
    return new Response(JSON.stringify({ error: 'กรุณาใส่เนื้อหา' }), {
      status: 400,
      headers: corsHeaders(env),
    })
  }

  const systemPrompt = `คุณเป็นผู้ช่วยเขียนรายงานการทำงานประจำวันภาษาไทย สำหรับข้าราชการ/พนักงาน
คุณจะได้รับ bullet points สั้นๆ ของงานที่ทำ แล้วต้องเขียนเป็นรายงานที่เป็นทางการ

กฎ:
1. ตอบเป็น HTML เท่านั้น ไม่ต้องมี markdown
2. ใช้รูปแบบ: <p>โครงการ: {ชื่อโครงการ} ประกอบไปด้วยผลการดำเนินงาน ดังนี้</p> ตามด้วย <ol><li>...</li></ol>
3. แต่ละ <li> ให้ขยายจาก bullet point สั้นๆ เป็นประโยคที่เป็นทางการ ชัดเจน
4. ใช้ภาษาไทยที่สุภาพ เป็นทางการ เหมาะสมกับรายงานราชการ
5. ห้ามเพิ่มงานที่ไม่ได้ระบุใน bullet points
6. ห้ามใส่ข้อความอธิบายหรือคำนำ ตอบเป็น HTML ล้วนๆ`

  const userMessage = `ชื่อโครงการ: ${projectName}
ผู้ปฏิบัติงาน: ${userName} (${userRole})

งานที่ทำ:
${bulletPoints}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'AI service error' }), {
      status: 502,
      headers: corsHeaders(env),
    })
  }

  const html = data.content[0].text

  return new Response(JSON.stringify({ html }), {
    headers: corsHeaders(env),
  })
}

async function handleTaigaProxy(request, env) {
  const { taigaBaseUrl, method, path, authToken, body, extraHeaders } = await request.json()

  // Validate inputs
  if (!taigaBaseUrl || !path) {
    return new Response(JSON.stringify({ error: 'Missing taigaBaseUrl or path' }), {
      status: 400,
      headers: corsHeaders(env),
    })
  }

  if (!taigaBaseUrl.startsWith('https://') && !taigaBaseUrl.startsWith('http://')) {
    return new Response(JSON.stringify({ error: 'Invalid taigaBaseUrl' }), {
      status: 400,
      headers: corsHeaders(env),
    })
  }

  if (!path.startsWith('/api/v1/')) {
    return new Response(JSON.stringify({ error: 'Invalid path — must start with /api/v1/' }), {
      status: 400,
      headers: corsHeaders(env),
    })
  }

  const url = taigaBaseUrl.replace(/\/+$/, '') + path
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  if (extraHeaders && typeof extraHeaders === 'object') {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value
    }
  }

  const fetchOptions = {
    method: method || 'GET',
    headers,
  }

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)
  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: corsHeaders(env),
  })
}

async function handleTaigaUpload(request, env) {
  const { taigaBaseUrl, authToken, projectId, objectId, taskId, imageBase64, filename, objectType } = await request.json()

  const objId = objectId || taskId // backward compat
  if (!taigaBaseUrl || !authToken || !projectId || !objId || !imageBase64) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: corsHeaders(env),
    })
  }

  // Convert base64 data URL to binary
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

  // Detect mime type from data URL
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
  const ext = mimeType.split('/')[1] || 'png'
  const fname = filename || `screenshot-${Date.now()}.${ext}`

  // Build multipart form data
  const formData = new FormData()
  formData.append('project', projectId.toString())
  formData.append('object_id', objId.toString())
  formData.append('attached_file', new Blob([binaryData], { type: mimeType }), fname)

  const attachmentPath = objectType === 'userstory' ? '/api/v1/userstories/attachments' : '/api/v1/tasks/attachments'
  const url = taigaBaseUrl.replace(/\/+$/, '') + attachmentPath

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  })

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: corsHeaders(env),
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders(env),
      })
    }

    try {
      const url = new URL(request.url)

      if (url.pathname === '/taiga/upload') {
        return await handleTaigaUpload(request, env)
      }

      if (url.pathname === '/taiga') {
        return await handleTaigaProxy(request, env)
      }

      // Default: AI proxy (handles both / and /ai)
      return await handleAIProxy(request, env)
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: corsHeaders(env),
      })
    }
  },
}
