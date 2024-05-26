require("dotenv").config();

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URL);

function isLoggedIn(req, res, next) {
    if (req.cookies.token === "") res.redirect("/login");
    const userEmail = jwt.verify(req.cookies.token, "secret");
    req.data = userEmail;
    next();
};

app.get('/', function (req, res) {
    res.render("register");
});

app.post("/register", async function (req, res) {
    let user = await userModel.findOne({ email: req.body.email });
    if (user) return res.send("user with this email already exists please login");
    const { email, fullname, username, password } = req.body;
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            let createdUser = await userModel.create({
                email,
                fullname,
                username,
                password: hash
            });
            let token = jwt.sign({ email }, "secret");
            res.cookie("token", token);
            res.redirect("/profile");
        });
    });
});

app.post("/logout", function (req, res) {
    res.cookie("token", "");
    res.redirect("/login");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", async function (req, res) {
    let user = await userModel.findOne({ email: req.body.email });
    if (!user) return res.send("no user found");


    bcrypt.compare(req.body.password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: user.email }, "secret");
            res.cookie("token", token);
            // res.send(posts)
            res.redirect("/profile");
        } else return res.send("wrong password");
    });
});

app.get("/profile", isLoggedIn, async function (req, res) {
    // const userId = req.queries.userId;
    let user = await userModel.findOne({ email: req.data.email });
    let posts = await postModel.find({ user: user._id })

    // res.render("profile", { user });
    res.render("profile", { user, posts });
});

app.get("/feed", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email }).populate("posts");
    let allPosts = [];

    user.posts.forEach((post) => {
        allPosts.push({
            post: post.picture,
            date: post.date,
            username: user.username,
            profile: user.profile
        });
    });


    user = await userModel.findOne({ email: req.data.email }).populate({
        path: "following",
        populate: {
            path: "posts"
        }
    }).exec();

    user.following.forEach((followingUser) => {
        followingUser.posts.forEach((post) => {
            allPosts.push({
                post: post.picture,
                date: post.date,
                username: followingUser.username,
                profile: followingUser.profile,
            });
        });
    });

    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.render("feed", { user, posts: allPosts });

});

app.get("/post", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email });
    res.render("post", { user });
});

app.post("/post", isLoggedIn, async function (req, res) {

    let user = await userModel.findOne({ email: req.data.email });
    let post = await postModel.create({
        user: user._id,
        picture: req.body.posturl,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");

});

app.get("/edit", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email });
    res.render("edit", { user });

});

app.post("/edit", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email });
    let posts = await postModel.find({ user: user._id });
    let updatedUser = await userModel.findOneAndUpdate({ email: user.email }, { profile: req.body.newpicurl }, { new: true });
    user = updatedUser;
    // res.send({ user, updatedUser });
    res.redirect("/profile");

    // userModel.findOneAndUpdate({ email: user.email }, { profile: req.body.newpicurl }, { new: true });
    // res.redirect("/profile", { user })
});

app.get("/search", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email });
    const users = await userModel.find({ _id: { $ne: user._id } }).sort({ fullname: 1 });

    res.render("search", { user, users });
});

app.post("/follow/:toFollow", isLoggedIn, async function (req, res) {
    const user = await userModel.findOne({ email: req.data.email });
    const toFollow = await userModel.findOne({ username: req.params.toFollow });
    let posts = await postModel.find({ user: user._id })
    toFollow.followers.push(user._id);
    await toFollow.save();
    user.following.push(toFollow._id);
    await user.save();
    res.redirect("/search");
});

app.post("/unfollow/:toUnfollow", isLoggedIn, async function (req, res) {
    const user = await userModel.findOne({ email: req.data.email });
    const toUnfollow = await userModel.findOne({ username: req.params.toUnfollow });
    user.following.splice(user.following.indexOf(toUnfollow._id), 1);
    await user.save();
    toUnfollow.followers.splice(toUnfollow.followers.indexOf(user._id), 1);
    await toUnfollow.save();
    res.redirect("/search");
});

app.post("/unfollow/following/:toUnfollow", isLoggedIn, async function (req, res) {
    const user = await userModel.findOne({ email: req.data.email });
    const toUnfollow = await userModel.findOne({ username: req.params.toUnfollow });
    user.following.splice(user.following.indexOf(toUnfollow._id), 1);
    await user.save();
    toUnfollow.followers.splice(toUnfollow.followers.indexOf(user._id), 1);
    await toUnfollow.save();
    res.redirect("/following");
});

app.get("/following", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email }).populate("following");
    let followingUsers = user.following.sort((a, b) => {
        // Extract the full names from the user objects
        let nameA = a.fullname.toUpperCase(); // Convert names to uppercase for case-insensitive comparison
        let nameB = b.fullname.toUpperCase();

        // Compare the full names
        if (nameA < nameB) {
            return -1; // Name A comes before name B
        } else if (nameA > nameB) {
            return 1; // Name B comes before name A
        } else {
            return 0; // Names are equal
        }
    });
    res.render("following", { user, followingUsers });
});

app.get("/followers", isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.data.email }).populate("followers");
    let followers = user.followers.sort((a, b) => {
        // Extract the full names from the user objects
        let nameA = a.fullname.toUpperCase(); // Convert names to uppercase for case-insensitive comparison
        let nameB = b.fullname.toUpperCase();

        // Compare the full names
        if (nameA < nameB) {
            return -1; // Name A comes before name B
        } else if (nameA > nameB) {
            return 1; // Name B comes before name A
        } else {
            return 0; // Names are equal
        }
    });
    res.render("followers", { user, followers });
});

app.listen(process.env.PORT);