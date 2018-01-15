module.exports = function (mongoose) {

    var Schema = mongoose.Schema;

    var GameSchema = new Schema({
        black: {
            type: Object,
            default: {
                time: {type: String},
                user: {type: Object}
            }
        },
        white: {
            type: Object,
            default: {
                time: {type: String},
                user: {type: Object}
            }
        },
        board: {type: Array},
        moves: {type: Array},
        postpone: {
            type: Boolean,
            default: false
        },
        winner: {
            type: Object,
            default: {}
        },
        lost: {
            type: Object,
            default: {}
        },
        finished: {type: Boolean}
    }, {collection: 'game'});

    return mongoose.model('game', GameSchema);
}
