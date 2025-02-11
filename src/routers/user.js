const express = require('express')
const router = new express.Router()
const multer = require('multer')
const sharp = require('sharp')
const auth = require('../middleware/auth')
const User = require('../models/users')

// insert - sign up
router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    }
    catch (e) {
        res.status(404).send(e)
    }
})

// log in
router.post('/users/login', async (req, res) => {
    try{
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    }
    catch(e){
        res.status(400).send()
    }
})

// log out
router.post('/users/logout', auth, async (req, res) => {
    try{
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send()
    }
    catch(e){
        res.status(500).send()
    }
})

// logout all
router.post('/users/logoutall', auth, async (req,res) => {
    try{
        req.user.tokens = []
        await req.user.save()
        res.status(200).send()
    }
    catch(e){
        res.status(500).send()
    }
})

// profile after authentication
router.get('/users/me', auth ,async (req, res) => {
    res.send(req.user)
})

// update
router.patch('/users/me', auth ,async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if(!isValidOperation){
        return res.status(400).send({ error : "Invalid update!" })
    }

    try{
        const user = req.user

        updates.forEach((update) => user[update] = req.body[update] )
        await user.save()
        res.send(user)
    }
    catch(e){
        res.status(400).send()
    }
})

// delete
router.delete('/users/me', auth ,async (req, res) => {
    try{
        await req.user.remove()
        res.send(req.user)
    }
    catch(e){
        res.status(500).send()
    }
})

// upload profile photo
const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            cb(new Error('Please upload only in .jpg, .jpeg, .png formate'))
        }

        cb(undefined, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req,res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

// delete profile photo
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send() 
})

// fetch profile photo
router.get('/users/:id/avatar', async (req, res) => {
    try{
        const user = await User.findById(req.params.id)

        if(!user || !user.avatar){
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    }
    catch(e){
        res.status(404).send()
    }
})

module.exports = router
