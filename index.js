var Promise = require('bluebird')
var absoluteUrl = Promise.promisify(require('ldapp-absolute-url').init())
var SimpleRDF = require('simplerdf/lite')

function attachAbsoluteUrl (req) {
  if (req.absoluteUrl) {
    return Promise.resolve()
  }

  return absoluteUrl(req, null)
}

function sendSimple (simple) {
  this.sendGraph(simple.graph())
}

function middleware (context, req, res, next) {
  attachAbsoluteUrl(req).then(function () {
    // create SimpleRDF object from req.graph
    req.simple = new SimpleRDF(context, req.absoluteUrl(), req.graph)

    // attach sendSimple method
    res.sendSimple = sendSimple
  }).asCallback(next)
}

function init (context) {
  return middleware.bind(null, context)
}

init.middleware = middleware

module.exports = init
