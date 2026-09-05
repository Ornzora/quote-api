const { app, ready } = require('../app')

const handler = app.callback()

module.exports = async (req, res) => {
  await ready

  if (req.url && req.url.startsWith('/quote/')) {
    req.url = req.url.slice('/quote'.length)
  }

  return handler(req, res)
}
