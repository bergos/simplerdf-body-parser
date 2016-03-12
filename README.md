# simplerdf-body-parser

The `simplerdf-body-parser` middleware converts a graph, attached to the request as `.graph`, to a SimpleRDF object and attaches that object to the request as `.simple`.
`rdf-body-parser` can be used to convert the incoming RDF data to a graph and attach it to `.graph`.
`simplerdf-body-parser` also attaches the `.sendSimple` function to the response to send a SimpleRDF object in the requested format.

## Usage

Import the `simplerdf-body-parser` and all other required modules:

    var rdfBodyParser = require('rdf-body-parser')
    var rdfFormats = require('rdf-formats-common')()
    var simpleBodyParser = require('simplerdf-body-parser')

First let's add the `rdf-body-parser` middleware:

    app.use(rdfBodyParser(rdfFormats))

The `simplerdf-body-parser` module returns a function to create a middleware which requires the context for the SimpleRDF objects.
So let's call that function:

    app.use(simpleBodyParser({
      'name': {
        '@id': 'http://schema.org/name'
      }
    }))

Now you can use the `.simple` property and `.sendSimple` function:

    app.use(function (req, res, next) {
       // .simple contains the SimpleRDF object
       if (req.simple) {
         console.log(req.simple.name)
       }

       // .sendSimple sends a SimpleRDF object to the client
       res.sendGraph(simple)
    })
