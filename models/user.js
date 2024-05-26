
const mongoose = require("mongoose");


let userSchema = mongoose.Schema({
    email: String,
    fullname: String,
    username: String,
    password: String,
    profile: {
        type: String,
        default: "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg"
    },
    posts: [
        { type: mongoose.Schema.Types.ObjectId, ref: "post" }
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: "user"
        }
    ],
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: "user"
        }
    ]

});

module.exports = mongoose.model("user", userSchema);