import React       from "react"
import ReactDOM    from "react-dom/server"
import bodyParser  from "body-parser"
import compression from "compression"
import express     from "express"
import serveStatic from "serve-static"
import {resolve}   from "path"

import Html from "../site/html"

const app = express()

app.use(bodyParser.json())
app.use(compression())

app.use("/public", serveStatic(resolve(__dirname, "../../public"), {
  setHeaders(res) {
    res.set("Cache-Control",
            process.env.NODE_ENV === "production"
            ? "public, max-age=31536000"
            : "private, max-age=0, no-cache")
  }
}))

app.get("/*", (req, res) => {
  res.set("Content-Type", "text/html")
  res.send(ReactDOM.renderToStaticMarkup(<Html/>))
})

app.use((err, req, res, next) => {
  console.error("%s", JSON.stringify(err))

  if (res.headersSent)
    return next(err)

  res.status(500)
  res.set({"content-type": "text/plain"})
  res.send(`${"message" in err ? err.message : err}`)
})

const server = app.listen(process.env.PORT || 3000, () => {
  /*eslint-disable*/
  console.log("Server listening at port", server.address().port)
  /*eslint-enable*/
})
