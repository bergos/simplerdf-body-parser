var SimpleRDF = require('simplerdf/lite')

function sendSimple (simple) {
  this.sendGraph(simple.graph())
}

function middleware (context, req, res, next) {
  // create SimpleRDF object from req.graph
  req.simple = new SimpleRDF(context, req.absoluteUrl(), req.graph)

  // attach sendSimple method
  res.sendSimple = sendSimple

  next()
}

function init (context) {
  return middleware.bind(null, context)
}

init.middleware = middleware

module.exports = init
