import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  // Endpoint khusus untuk submit: POST /posts/:id/submit
  @Post(':id/submit')
  submit(@Param('id') id: string, @Request() req) { // 2. Gunakan @Request()
    const userId = req.user.sub; // 3. Ambil ID otomatis dari Tiket JWT!
    return this.postsService.submit(id, userId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req) { // 2. Gunakan @Request()
    const userId = req.user.sub; // 3. Ambil ID otomatis dari Tiket JWT!
    return this.postsService.approve(id, userId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string, @Request() req) {
    const userId = req.user.sub; // 3. Ambil ID otomatis dari Tiket JWT!
    return this.postsService.reject(id, userId, reason);
  }

  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
  
}
