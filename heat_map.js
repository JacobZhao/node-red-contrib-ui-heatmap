/**
 * Copyright 2019 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    var settings = RED.settings;

     function HTML(config) { 
        // The configuration is a Javascript object, which needs to be converted to a JSON string
        var configAsJson = JSON.stringify(config);

        var html = String.raw`
        <script src="heatmap/js/heatmap.min.js"></script>
        <div id="heatMapContainer" width="100%" height="100%" ng-init='init(` + configAsJson + `)'></canvas>
        `;
        
        return html;
    };

    function checkConfig(node, conf) {
        if (!conf || !conf.hasOwnProperty("group")) {
            node.error(RED._("heat-map.error.no-group"));
            return false;
        }
        return true;
    }
    
    // See https://gist.github.com/maxwells/8251275
    function findColorBetween(left, right, percentage) {
        newColor = {};
        components = ["r", "g", "b"];
        for (var i = 0; i < components.length; i++) {
            c = components[i];
            newColor[c] = Math.round(left[c] + (right[c] - left[c]) * percentage / 100);
        }
        return new Color(newColor);
    }

    var ui = undefined;
    
    function HeatMapNode(config) {
         try {
            var node = this;
            if(ui === undefined) {
                ui = RED.require("node-red-dashboard")(RED);
            }
            RED.nodes.createNode(this, config);

        if (checkConfig(node, config)) { 
            var html = HTML(config);
            var done = ui.addWidget({
                node: node,
                group: config.group,
                width: config.width,
                height: config.height,
                format: html,
                templateScope: "local",
                emitOnlyNewValues: false,
                forwardInputMessages: false,
                storeFrontEndInputAsState: false,
                convertBack: function (value) {
                    return value;
                },
                beforeEmit: function(msg, value) {
                    return { msg: msg };
                },
                beforeSend: function (msg, orig) {
                    if (orig) {
                        return orig.msg;
                    }
                },
                initController: function($scope, events) {
                    $scope.flag = true;
			
                    $scope.init = function (config) {
                        $scope.config = config;
                        
                        $scope.heatMapInstance = h337.create({
        		    container: document.querySelector('heatMapContainer')
      			});
                    };

                    $scope.$watch('msg', function(msg) {
                        if (!msg) {
                            // Ignore undefined msg
                            return;
                        }
                        
                        debugger;

                        if (msg.payload && Array.isArray(msg.payload) && msg.payload.length = $scope.config.rows * $scope.config.columns) {
                            var canvas = document.getElementById('heatMapCanvas')
                            var ctx = canvas.getContext('2d');
                            var canvasWidth = canvas.width;
                            var canvasHeight = canvas.height;
                            
                            var maximumValue = Math.max(msg.payload);
                            
		            // See https://www.patrick-wied.at/static/heatmapjs/example-minimal-config.html
		           var data = { max: maximumValue, data: msg.payload };

                           // Refresh the heatmap content, by setting new values
      			   $scope.heatMapInstance.setData(data);
                        }
                    });
                 
                    $scope.change = function() {
                        // The data will be stored in the model on the scope
                        $scope.send({payload: $scope.textContent});
                    };

                    $scope.enterkey = function(keyEvent){
                        if (keyEvent.which === 13) {
                            $scope.send({payload: $scope.textContent});
                        }
                    };
                }
            });
        }
        }
        catch (e) {
            console.log(e);
        }
		
        node.on("close", function() {
            if (done) {
                done();
            }
        });
    }

    RED.nodes.registerType("heat-map", HeatMapNode);
	
    // Make all the static resources from this node public available (i.e. heatmap.js library).
    RED.httpAdmin.get('/heatmap/js/*', function(req, res){
        var options = {
            root: __dirname /*+ '/static/lib/'*/,
            dotfiles: 'deny'
        };
       
        // Send the requested file to the client (in this case it will be heatmap.min.js)
        res.sendFile(req.params[0], options)
    });
}
