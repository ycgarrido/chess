module.exports = function (mongoose) {

    var Schema = mongoose.Schema;

    var UserSchema = new Schema({
        username: String,
        password: String,
        name: String,
        invites: Array,
        profile: {
            type: Object,
            default: {
                time: Object,
                color: String,
                board: String,
                promove: String,
                piece: String
            }
        },
        elo: Number

    }, {collection: 'user'});

    return mongoose.model('user', UserSchema);
}
