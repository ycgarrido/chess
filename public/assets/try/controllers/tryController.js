(function () {
    'use strict';
    angular
        .module('chessApp')
        .controller("tryController", tryController);

    function tryController($rootScope, socket, $state) {
        var vm = this;
        socket.emit('setpage', $state.current.name);
        vm.cMoves = [];
        vm.cFinished = false;
        vm.cBoard = [
            [
                {
                    "type": "tower",
                    "color": true,
                    "initial": true
                },
                {
                    "type": "horse",
                    "color": true
                },
                {
                    "type": "alfil",
                    "color": true
                },
                {
                    "type": "king",
                    "color": true,
                    "initial": true
                },
                {
                    "type": "queen",
                    "color": true
                },
                {
                    "type": "alfil",
                    "color": true
                },
                {
                    "type": "horse",
                    "color": true
                },
                {
                    "type": "tower",
                    "color": true,
                    "initial": true
                }
            ],
            [
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                },
                {
                    "type": "peon",
                    "color": true
                }
            ],
            [
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                }
            ],
            [
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                }
            ],
            [
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                }
            ],
            [
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                },
                {
                    "type": false
                }
            ],
            [
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                },
                {
                    "type": "peon",
                    "color": false
                }
            ],
            [
                {
                    "type": "tower",
                    "color": false,
                    "initial": true
                },
                {
                    "type": "horse",
                    "color": false
                },
                {
                    "type": "alfil",
                    "color": false
                },
                {
                    "type": "king",
                    "color": false,
                    "initial": true
                },
                {
                    "type": "queen",
                    "color": false
                },
                {
                    "type": "alfil",
                    "color": false
                },
                {
                    "type": "horse",
                    "color": false
                },
                {
                    "type": "tower",
                    "color": false,
                    "initial": true
                }
            ]
        ];
    }
})
();