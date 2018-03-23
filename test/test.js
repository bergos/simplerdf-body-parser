/* global describe, it */

const assert = require('assert')
const express = require('express')
const rdf = require('rdf-ext')
const request = require('supertest')
const simpleBodyParser = require('..')
const url = require('url')
const SimpleCore = require('simplerdf-core')

describe('simplerdf-body-parser', () => {
  const app = express()

  app.use((req, res, next) => {
    req.absoluteUrl = () => {
      return 'http://example.org' + req.originalUrl
    }

    next()
  })

  describe('parse', () => {
    it('should attach a SimpleCore object to req.simple with IRI set to absoluteUrl()', () => {
      let simple

      app.use('/parse/simple-iri', simpleBodyParser())
      app.use('/parse/simple-iri', (req, res) => {
        simple = req.simple

        res.end()
      })

      return request(app)
        .get('/parse/simple-iri')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert(simple)
          assert(simple instanceof SimpleCore)
          assert.equal(simple.iri().toString(), 'http://example.org/parse/simple-iri')
          assert.equal(simple.graph().length, 0)
        })
    })

    it('should use the default absoluteUrl implementation if none was provided', () => {
      let simple

      app.use('/parse/simple-absolute-url', (req, res, next) => {
        delete req.absoluteUrl

        next()
      })
      app.use('/parse/simple-absolute-url', simpleBodyParser())
      app.use('/parse/simple-absolute-url', (req, res) => {
        simple = req.simple

        res.end()
      })

      return request(app)
        .get('/parse/simple-absolute-url')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert(simple)
          assert(simple instanceof SimpleCore)
          assert.equal(url.parse(simple.iri().toString()).pathname, '/parse/simple-absolute-url')
        })
    })

    it('should use the default rdf body parser implementation if none was provided', () => {
      let simple

      app.use('/parse/simple-rdf-body-parser', simpleBodyParser())
      app.use('/parse/simple-rdf-body-parser', (req, res) => {
        simple = req.simple

        res.end()
      })

      return request(app)
        .post('/parse/simple-rdf-body-parser')
        .set('Accept', 'text/turtle')
        .set('Content-Type', 'text/turtle')
        .send('<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .')
        .expect(200)
        .then(() => {
          assert(simple)
          assert(simple instanceof SimpleCore)
          assert.equal(simple.graph().length, 1)
        })
    })

    it('should attach a SimpleCore object to req.simple with IRI set to absoluteUrl() and the given input graph', () => {
      const graph = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/parse/simple-iri-graph'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.namedNode('http://example.org/object'))
      ])

      let simple

      app.use('/parse/simple-iri-graph', (req, res, next) => {
        req.graph = graph

        next()
      })
      app.use('/parse/simple-iri-graph', simpleBodyParser())
      app.use('/parse/simple-iri-graph', (req, res) => {
        simple = req.simple

        res.end()
      })

      return request(app)
        .get('/parse/simple-iri-graph')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert(simple)
          assert(simple instanceof SimpleCore)
          assert.equal(simple.iri().toString(), 'http://example.org/parse/simple-iri-graph')
          assert(simple.graph().equals(graph))
        })
    })

    it('should use the given context', () => {
      const graph = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/parse/simple-context'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.namedNode('http://example.org/object'))
      ])

      let simple

      app.use('/parse/simple-context', (req, res, next) => {
        req.graph = graph

        next()
      })
      app.use('/parse/simple-context', simpleBodyParser({
        predicate: {
          '@id': 'http://example.org/predicate',
          '@type': '@id'
        }
      }))
      app.use('/parse/simple-context', (req, res) => {
        simple = req.simple

        res.end()
      })

      return request(app)
        .get('/parse/simple-context')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert(simple)
          assert(simple instanceof SimpleCore)
          assert(simple.predicate)
          assert.equal(simple.predicate, 'http://example.org/object')
        })
    })

    it('should use a custom Simple constructor if given in options', () => {
      const graph = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/parse/simple-iri-graph'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.namedNode('http://example.org/object'))
      ])

      class CustomSimple {}

      const Simple = SimpleCore.extend(CustomSimple)

      let simple

      app.use('/parse/simple-custom-factory', (req, res, next) => {
        req.graph = graph

        next()
      })
      app.use('/parse/simple-custom-factory', simpleBodyParser({}, {
        Simple: Simple
      }))
      app.use('/parse/simple-custom-factory', (req, res) => {
        simple = req.simple

        res.end()
      })

      return request(app)
        .get('/parse/simple-custom-factory')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert(simple instanceof Simple)
        })
    })
  })

  describe('send', () => {
    it('should attach the send method to res.sendSimple', () => {
      let sendSimple

      app.use('/send/simple-function', simpleBodyParser())
      app.use('/send/simple-function', (req, res) => {
        sendSimple = res.sendSimple

        res.end()
      })

      return request(app)
        .get('/send/simple-function')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert.equal(typeof sendSimple, 'function')
        })
    })

    it('should send the graph of a SimpleCore object via res.sendSimple', () => {
      const simple = new SimpleCore({predicate: {
        '@id': 'http://example.org/predicate',
        '@type': '@id'
      }}, 'http://example.org/subject')

      simple.predicate = 'http://example.org/object'

      let graph

      app.use('/send/simple-send', (req, res, next) => {
        res.sendGraph = sentGraph => {
          graph = sentGraph
        }

        next()
      })
      app.use('/send/simple-send', simpleBodyParser())
      app.use('/send/simple-send', (req, res) => {
        res.sendSimple(simple)

        res.end()
      })

      return request(app)
        .get('/send/simple-send')
        .set('Accept', 'application/ld+json')
        .expect(200)
        .then(() => {
          assert(graph)
          assert(graph.equals(simple.graph()))
        })
    })
  })
})
