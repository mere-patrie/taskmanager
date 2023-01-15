const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase_auth.json');
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
initializeApp({credential: cert(serviceAccount)});
const db = getFirestore();

const saltRounds = 10;
const usersRef = db.collection('users');
const tasksRef = db.collection('tasks');
const pagesRef = db.collection('pages');



// Auth routes

app.post("/login", async(req, res) => {
    const password = req.body.password;
    const email = req.body.email;
    const doc = await usersRef.where("email", "==", `${email}`).limit(1).get();
    if (doc.empty) {
        res.send({status:400, data: "L'utilisateur n'existe pas!"})
    }else {
        doc.forEach(user => {
            bcrypt.compare(password, user.data().password, function(err, compare) {
                if(compare){
                    res.send({status:200, data: generateAccessToken(email)})
                }else{
                    res.send({status:400, data: "Identifiants incorrects!"})
                }
            });
        })
    }
});
app.post("/sign-in", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const doc = await usersRef.where("email", "==", `${email}`).limit(1).get();
    if (!doc.empty) {
        res.send({status:400, data: "L'utilisateur existe dejà!"})
    }else {
        bcrypt.genSalt(saltRounds, (err, salt) => {
            bcrypt.hash(password, salt, async(err, hash) => {
                if(!err){
                    await usersRef.add({
                        email: email,
                        password: hash
                    });
                    res.send({status:200, data: generateAccessToken(email)});
                }else{
                    res.send({status:400, data:"Un problème est arrivé!"});
                }
            });
        });
    }
});
app.post("/auth", (req, res) => {
    const token = req.body.token
    if (token == null) return res.sendStatus(401)
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        res.send({status:200, data:user})
    })
})
function generateAccessToken(username) {
    return jwt.sign(username, process.env.TOKEN_SECRET);
}



// Tasks routes

app.post("/addTask", (req, res) => {
    const token = req.body.token;
    const page = req.body.page;
    if (token == null) return res.sendStatus(401)
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        const userEmail = user;
        const taskName = req.body.taskName;
        const taskDescription = req.body.taskDescription;
        const state = req.body.state;
        tasksRef.add({
            page:page,
            user:userEmail,
            taskName:taskName,
            taskDescription:taskDescription,
            timestamp:FieldValue.serverTimestamp(),
            state:state
        });
        const doc  = await tasksRef.where("user", "==", `${userEmail}`).orderBy("timestamp", "desc").limit(1).get();
        doc.forEach(task => {
            res.send({status:200, data:task.data(),id:task.id});
        });
    });
});
app.get("/getTasks", (req, res) => {
    const token = req.query.token;
    const page = req.query.page;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        const userEmail = user;
        const snapshot  = await tasksRef.where("user", "==", `${userEmail}`).where("page", "==", `${page}`).orderBy("timestamp", "desc").get();
        var tasks = [];
        snapshot.forEach((doc) => {
            tasks.push({id:doc.id, data: doc.data()});
        });
        res.send({status:200, data:tasks});
    });
});
app.post("/deleteTask", (req, res) => {
    const token = req.body.token;
    const docId = req.body.docId;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        await tasksRef.doc(`${docId}`).delete();
        res.send({status:200, data:"Success!"});
    });
});
app.post("/moveTask", (req, res) => {
    const token = req.body.token;
    const docId = req.body.docId;
    const moveTo = req.body.moveTo;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        await tasksRef.doc(`${docId}`).update({state:`${moveTo}`})
        res.send({status:200, data:"Success!"});
    });
});



// Pages

app.get("/", (req, res) => {
    res.sendFile("public/index.html", {root:"../"})
})
app.get("/dashboard", (req, res) => {
    res.sendFile("public/dashboard.html", {root:"../"})
})
app.get("/p/", (req, res) => {
    res.redirect("/")
})
app.get("/p/:pageId", (req, res) => {
    const pageId = req.params.pageId;
    res.sendFile("public/page.html", {root:"../"});
})
app.post("/createPage", (req, res) => {
    const token = req.body.token;
    const name = req.body.name;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        await pagesRef.add({
            creator:user,
            pageName:name,
            timestamp:FieldValue.serverTimestamp()
        });
        const doc  = await pagesRef.where("pageName", "==", `${name}`).orderBy("timestamp", "desc").limit(1).get();
        doc.forEach(task => {
            res.send({status:200, data:task.data(),id:task.id});
        });
    });
});
app.get("/userPages", (req, res) => {
    const token = req.query.token;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        const snapshot = await pagesRef.where("creator", "==", `${user}`).get();
        var pages = [];
        snapshot.forEach((doc) => {
            pages.push({id:doc.id, data:doc.data()})
        });
        res.send({status:200, data:pages});
    });
});
app.get("/pagesSharedWithUser", (req, res) => {
    const token = req.query.token;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        const snapshot = await pagesRef.where("authorized", "array-contains", `${user}`).get();
        var pages = [];
        snapshot.forEach((doc) => {
            pages.push({id:doc.id, data:doc.data()});
        });
        res.send({status:200, data:pages});
    });
});
app.post("/deletePage", (req, res) => {
    const token = req.body.token;
    const page = req.body.page;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        await pagesRef.doc(`${page}`).delete();
        const snapshot = await tasksRef.where("page", "==", `${page}`).get()
        snapshot.forEach(async(doc) => {
            await tasksRef.doc(`${doc.id}`).delete();
        });
        res.send({status:200, data:"Success!"});
    });
})



// Others

app.post("/share", (req, res) => {
    const token = req.body.token;
    const page = req.body.page;
    const email = req.body.email;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        await pagesRef.doc(`${page}`).update({authorized:FieldValue.arrayUnion(email)});
        res.send({status:200, data:"Sucess"});
    });
});
app.get("/sharedWith", (req, res) => {
    const token = req.query.token;
    const page = req.query.page;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        const doc = await pagesRef.doc(`${page}`).get();
        if (!doc.exists) {
            res.send({status:400, data:"Page does not exists!"});
        } else {
            res.send({status:200, data:doc.data(), id:doc.id});
        }
    });
});
app.post("/deleteSharing", (req, res) => {
    const token = req.body.token;
    const page = req.body.page;
    const email = req.body.email;
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.TOKEN_SECRET, async(err, user) => {
        if (err) return res.send({status:400, data:"Back"});
        await pagesRef.doc(`${page}`).update({authorized:FieldValue.arrayRemove(email)});
        res.send({status:200, data:"Success"});
    });
});



app.listen(process.env.PORT || 8080, () => {
    console.log("Listening on http://localhost:8080")
});