export function useUtils() {
  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  function stripHtml(html) {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  function htmlToPlainText(html) {
    const temp = document.createElement('div')
    temp.innerHTML = html

    temp.querySelectorAll('ol').forEach(ol => {
      let index = 1
      ol.querySelectorAll('li').forEach(li => {
        li.innerHTML = `${index}. ${li.innerHTML}`
        index++
      })
    })
    temp.querySelectorAll('ul').forEach(ul => {
      ul.querySelectorAll('li').forEach(li => {
        li.innerHTML = `• ${li.innerHTML}`
      })
    })

    temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
    temp.querySelectorAll('p, li, div').forEach(el => {
      el.innerHTML = el.innerHTML + '\n'
    })

    return temp.textContent.replace(/\n{3,}/g, '\n\n').trim()
  }

  async function copyToClipboard(text, html = null) {
    try {
      if (html) {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
        await navigator.clipboard.write([clipboardItem])
      } else {
        await navigator.clipboard.writeText(text)
      }
      return { success: true }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(text)
        return { success: true }
      } catch (e) {
        console.error('Copy failed:', e)
        return { success: false }
      }
    }
  }

  function downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  function generatePlainTextWithIndent(element) {
    let text = ''

    function processNode(node, indent = 0) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase()

        if (tag === 'p' || tag === 'div') {
          Array.from(node.childNodes).forEach(child => processNode(child, indent))
          text += '\n'
        } else if (tag === 'br') {
          text += '\n'
        } else if (tag === 'ul' || tag === 'ol') {
          Array.from(node.children).forEach((li, index) => {
            const prefix = tag === 'ol' ? `${index + 1}. ` : '• '
            text += '    '.repeat(indent) + prefix
            Array.from(li.childNodes).forEach(child => {
              if (child.tagName === 'UL' || child.tagName === 'OL') {
                text += '\n'
                processNode(child, indent + 1)
              } else {
                processNode(child, indent)
              }
            })
            if (!text.endsWith('\n')) text += '\n'
          })
        } else if (tag === 'li') {
          Array.from(node.childNodes).forEach(child => processNode(child, indent))
        } else {
          Array.from(node.childNodes).forEach(child => processNode(child, indent))
        }
      }
    }

    processNode(element)
    return text.trim()
  }

  function createConfetti() {
    const container = document.createElement('div')
    container.className = 'confetti-container'
    document.body.appendChild(container)

    const colors = ['#194987', '#0f3260', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B']
    const shapes = ['circle', 'square', 'triangle']
    const confettiCount = 150

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div')
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      confetti.className = `confetti ${shape}`

      const color = colors[Math.floor(Math.random() * colors.length)]
      if (shape === 'triangle') {
        confetti.style.borderBottomColor = color
      } else {
        confetti.style.backgroundColor = color
      }

      confetti.style.left = Math.random() * 100 + '%'
      confetti.style.top = -20 + 'px'
      confetti.style.animationDelay = Math.random() * 0.5 + 's'
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's'

      const size = 6 + Math.random() * 10
      if (shape !== 'triangle') {
        confetti.style.width = size + 'px'
        confetti.style.height = size + 'px'
      }

      container.appendChild(confetti)
    }

    setTimeout(() => {
      container.remove()
    }, 4000)
  }

  return {
    escapeHtml,
    stripHtml,
    htmlToPlainText,
    copyToClipboard,
    downloadFile,
    generatePlainTextWithIndent,
    createConfetti
  }
}
