const mongoose = require("mongoose");

let postSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    picture: String,
    date: {
        type: Date,
        default: Date.now
    },
    like: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: "user"
        }
    ]
});

module.exports = mongoose.model("post", postSchema);