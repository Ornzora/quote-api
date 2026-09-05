require('dotenv').config({ path: './.env' })

const { app, ready } = require('./app')
const port = process.env.PORT || 3000

ready.then(() => {
  app.listen(port, () => {
    console.log('Listening on localhost, port', port)
  })
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
