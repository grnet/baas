// Copyright (C) 2015-2016 GRNET S.A.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
var fs = require('fs');
var util = require('util');
var url = require('url');

/** @return http: --> http, https: --> https, null otherwise */
function  getProtocol(prefix) {
    switch (prefix) {
        case "http:": return require('http');
        case "https:": return require('https');
    }
    return null;
}
/**
 * Read the path (utf8), chop it to individual certificates
 * @return {[String, ...]} An array with all the certificates
 */
function splitCA(CAPath) {
    chain = fs.readFileSync(CAPath, 'utf8').split('\n')
    ca = [];
    for (i=0, cert=[]; i < chain.length; i++) {
        cert.push(chain[i]);
        line = chain[i];
        if (line.match(/-END CERTIFICATE-/)) {
            ca.push(cert.join('\n'));
            cert = [];
        }
    }
    return ca;
}

/**
 * An HTTP(S) client to make requests to the cloud. An instance of this class
 * should be used to make requests to a specific service e.g., Identity,
 * Storage, Compute, etc.
 *
 * It provides RESTfull methods: get, head, post, put, delete, update
 * 
 * @param {String} endpointURL - trailing / is removed automatically
 * @param {String} token - modify it as a property e.g. client.token = "tkn"
 * @param {String } CAPath - the path of the CA certificates bundle file 
 */
var Client = function(endpointURL, token, CAPath) {
    var _options = {host: null, headers: { }, };
    var _url, _parser, _protocol, _token;

    this.setURL = function(newURL) {
        _url = newURL;
        _parser = url.parse(newURL);
        _options.host = _parser.host;
        _protocol = getProtocol(_parser.protocol);
        if (_protocol) _endpoint = _parser.pathname.replace(/\/$/, "");
        else throw "Unknown URL protocol";
    };
    this.getURL = function() { return _url; };
    this.equalsURL = function(URL) { return URL === _url; };

    this.setToken = function(newToken) {
        _token = newToken;
        if (_token) util._extend(_options.headers, { 'X-Auth-Token': _token, });
        else delete _options.headers['X-Auth-Token'];
    };
    this.getToken = function() { return _token; }

    this.setCA = function(newCAPath) {
        this.CAPath = newCAPath;
        if (newCAPath) _options.ca = splitCA(newCAPath);
        else delete _options.ca;
    };
    this.getCA = function() { return _options.ca; };

    this.setURL(endpointURL);
    this.setToken(token);
    this.setCA(CAPath);

    this.post = function(path, headers, send_data, status, handle_res, handle_err) {
        handle_res = handle_res || function(r){ console.log(r); };
        handle_err = handle_err || function(e){ console.log(e); };

        var post_opts = util._extend({
            method: 'POST',
            path: _endpoint + path,
        }, _options);
        post_opts.headers = util._extend({}, _options.headers);

        util._extend(post_opts.headers, headers);
        if (send_data) {
            h = post_opts.headers;
            util._extend(post_opts.headers, {
                'Content-Type':  h['Content-Type'] || 'application/json',
                'Content-Length': h['Content-Length'] ||
                    Buffer.byteLength(send_data),
            });
        };

        _req = _protocol.request(post_opts, function(res){
            _recv_data = '';
            res.on('data', function(d) { _recv_data+=d; });

            res.on('end', function() {
                if ((status || 200) !== res.statusCode) {
                    handle_err(res.statusCode + " " +
                        res.statusMessage, res.headers);
                } else handle_res(_recv_data, res.headers);
            });
        });

        if (send_data) _req.write(send_data);
        _req.end();
        _req.on('error', handle_err);
    };
};

module.exports = { Client: Client };

/**
 * Test if client is working correctly.
 */
function testClient(token) {
  var astakos = new Client(
    "https://accounts.okeanos.grnet.gr/identity/v2.0",
    token,
    "/etc/ssl/certs/ca-certificates.crt"
  );

  data2send = { auth: { token: { id: token } } };

  function print_user_name(data, headers) {
    var jdata = JSON.parse(data);
    console.log(jdata.access.user.name);
    console.log(headers);
  }

  // astakos.post('/tokens', null, null, 200, function(m){console.log("Result: " + m)});
  astakos.post('/tokens', null,  JSON.stringify(data2send), 200, print_user_name);
}

// testClient("t0k3n");
