/* global describe, it */

var Promise = require('bluebird')
var assert = require('assert')
var express = require('express')
var rdf = require('rdf-ext')
var request = require('supertest')
var simpleBodyParser = require('..')
var url = require('url')
var SimpleRDF = require('simplerdf/lite')

function asyncAssert (done, callback) {
  Promise.resolve().then(callback).asCallback(done)
}

describe('simplerdf-body-parser', function () {
  var app = express()

  app.use(function (req, res, next) {
    req.absoluteUrl = function () {
      return 'http://example.org' + this.originalUrl
    }

    next()
  })

  describe('parse', function () {
    it('should attach a SimpleRDF object to req.simple with IRI set to absoluteUrl()', function (done) {
      var simple

      app.use('/parse/simple-iri', simpleBodyParser())
      app.use('/parse/simple-iri', function (req, res) {
        simple = req.simple

        res.end()
      })

      request(app)
        .get('/parse/simple-iri')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(simple)
            assert(simple instanceof SimpleRDF)
            assert.equal(simple.iri().toString(), 'http://example.org/parse/simple-iri')
            assert.equal(simple.graph().length, 0)
          })
        })
    })

    it('should use default absoluteUrl implementation of none was provided', function (done) {
      var simple

      app.use('/parse/simple-absolute-url', function (req, res, next) {
        delete req.absoluteUrl

        next()
      })
      app.use('/parse/simple-absolute-url', simpleBodyParser())
      app.use('/parse/simple-absolute-url', function (req, res) {
        simple = req.simple

        res.end()
      })

      request(app)
        .get('/parse/simple-absolute-url')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(simple)
            assert(simple instanceof SimpleRDF)
            assert.equal(url.parse(simple.iri().toString()).pathname, '/parse/simple-absolute-url')
          })
        })
    })

    it('should attach a SimpleRDF object to req.simple with IRI set to absoluteUrl() and the given input graph', function (done) {
      var graph = rdf.createGraph([
        rdf.createTriple(
          rdf.createNamedNode('http://example.org/parse/simple-iri-graph'),
          rdf.createNamedNode('http://example.org/predicate'),
          rdf.createNamedNode('http://example.org/object'))
      ])
      var simple

      app.use('/parse/simple-iri-graph', function (req, res, next) {
        req.graph = graph

        next()
      })
      app.use('/parse/simple-iri-graph', simpleBodyParser())
      app.use('/parse/simple-iri-graph', function (req, res) {
        simple = req.simple

        res.end()
      })

      request(app)
        .get('/parse/simple-iri-graph')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(simple)
            assert(simple instanceof SimpleRDF)
            assert.equal(simple.iri().toString(), 'http://example.org/parse/simple-iri-graph')
            assert(simple.graph().equals(graph))
          })
        })
    })

    it('should use the given context', function (done) {
      var graph = rdf.createGraph([
        rdf.createTriple(
          rdf.createNamedNode('http://example.org/parse/simple-context'),
          rdf.createNamedNode('http://example.org/predicate'),
          rdf.createNamedNode('http://example.org/object'))
      ])
      var simple

      app.use('/parse/simple-context', function (req, res, next) {
        req.graph = graph

        next()
      })
      app.use('/parse/simple-context', simpleBodyParser({
        predicate: {
          '@id': 'http://example.org/predicate',
          '@type': '@id'
        }
      }))
      app.use('/parse/simple-context', function (req, res) {
        simple = req.simple

        res.end()
      })

      request(app)
        .get('/parse/simple-context')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(simple)
            assert(simple instanceof SimpleRDF)
            assert(simple.predicate)
            assert.equal(simple.predicate, 'http://example.org/object')
          })
        })
    })
  })

  describe('send', function () {
    it('should attach the send method to res.sendSimple', function (done) {
      var sendSimple

      app.use('/send/simple-function', simpleBodyParser())
      app.use('/send/simple-function', function (req, res) {
        sendSimple = res.sendSimple

        res.end()
      })

      request(app)
        .get('/send/simple-function')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert.equal(typeof sendSimple, 'function')
          })
        })
    })

    it('should send the graph of a SimpleRDF object via res.sendSimple', function (done) {
      var simple = new SimpleRDF({predicate: {
        '@id': 'http://example.org/predicate',
        '@type': '@id'
      }}, 'http://example.org/subject')

      simple.predicate = 'http://example.org/object'

      var graph

      app.use('/send/simple-send', function (req, res, next) {
        res.sendGraph = function (sentGraph) {
          graph = sentGraph
        }

        next()
      })
      app.use('/send/simple-send', simpleBodyParser())
      app.use('/send/simple-send', function (req, res) {
        res.sendSimple(simple)

        res.end()
      })

      request(app)
        .get('/send/simple-send')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(graph)
            assert(graph.equals(simple.graph()))
          })
        })
    })
  })
})
