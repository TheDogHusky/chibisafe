import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '@/structures/database.js';
import type { RequestWithUser } from '@/structures/interfaces.js';
import { http4xxErrorSchema } from '@/structures/schemas/HTTP4xxError.js';
import { http5xxErrorSchema } from '@/structures/schemas/HTTP5xxError.js';
import { responseMessageSchema } from '@/structures/schemas/ResponseMessage.js';

export const schema = {
	summary: 'Get files albums',
	description: 'Gets all the albums from the supplied files',
	tags: ['Files', 'Albums', 'Bulk'],
	body: z.object({
		files: z.array(z.string()).optional().nullable().default([])
	}),
	response: {
		200: z.object({
			message: responseMessageSchema,
			albums: z.array(
				z.object({
					uuid: z.string().describe('The uuid of the album.'),
					name: z.string().describe('The name of the album.')
				})
			)
		}),
		'4xx': http4xxErrorSchema,
		'5xx': http5xxErrorSchema
	}
};

export const options = {
	url: '/files/albums',
	method: 'post',
	middlewares: ['apiKey', 'auth']
};

export const run = async (req: RequestWithUser, res: FastifyReply) => {
	const { files } = req.body as z.infer<typeof schema.body>;

	if (!files?.length) {
		void res.badRequest('No file uuids provided');
		return;
	}

	const dbFiles = await prisma.files.findMany({
		where: {
			uuid: {
				in: files
			},
			userId: req.user.id
		},
		select: {
			uuid: true,
			albums: {
				select: {
					uuid: true,
					name: true
				}
			}
		}
	});

	const albums = dbFiles.flatMap(file => file.albums);
	const filteredAlbums = albums.filter((album, index, self) => self.findIndex(a => a.uuid === album.uuid) === index);

	return res.send({
		message: 'Successfully retrieved albums',
		albums: filteredAlbums
	});
};
