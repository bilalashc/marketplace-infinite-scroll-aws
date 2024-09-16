import express, { Request, Response } from 'express';
// import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';


const router = express.Router()

//AWS configuration
const s3 = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

//S3 Storage Configuration for Multer
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME as string,
        acl: 'public-read',
        key: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${uuidv4()}`; // Generate unique file key
            cb(null, `images/${uniqueSuffix}-${file.originalname}`);
        },
    })
})

//Post Items - Create new item
router.post('/', upload.single('image'), async(req: Request, res: Response ) => {
    const {title, description, category } = req.body;
    const userId = req.user?.sub

    if (!title || !description || !category){
        return res.status(400).json({message: "Missing Required Fields"})
    }

    const itemId = uuidv4();
    const createdAt = Date.now()

    const newItem: {
        itemId: string,
        title: string,
        description: string,
        category: string,
        imageUrl?: string,
        createdAt: number
        userId?: string,
    }= {
        itemId,
        title,
        description,
        category,
        createdAt,
        userId,
    }

    if (req.file) {
        const file = req.file as Express.MulterS3.File
        newItem.imageUrl = file.location;
    }

    const params = {
        TableName: 'Items',
        Item: newItem,
    }

    try {
        await dynamoDB.send(new PutCommand(params)); //Save the item to DynamoDB
        res.status(201).json(newItem); //Return the created item
    } catch (error){
        console.error("Error creating Item", error)
        res.status(500).json({message: 'Internal Server Error'})
    }
})


export default router;