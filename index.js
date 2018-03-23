const absoluteUrl = require('absolute-url')
const bodyParser = require('rdf-body-parser')
const SimpleCore = require('simplerdf-core')

function sendSimple (simple) {
  this.sendGraph(simple.graph())
}

function factory (context, options) {
  options = options || {}

  const Simple = options.Simple || SimpleCore

  return (req, res, next) => {
    absoluteUrl.attach(req)

    bodyParser.attach(req, res).then(() => {
      // create SimpleRDF object from req.graph
      req.simple = new Simple(context, req.absoluteUrl(), req.graph)

      // attach sendSimple method
      res.sendSimple = sendSimple
    }).then(next).catch(next)
  }
}

module.exports = factory
