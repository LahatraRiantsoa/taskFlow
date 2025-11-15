<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Entity\Task;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/comments')]
final class CommentController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('', name: 'comment_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $comments = $this->em->getRepository(Comment::class)->findAll();
        return $this->json($comments);
    }

    #[Route('/{id}', name: 'comment_show', methods: ['GET'])]
    public function show(Comment $comment): JsonResponse
    {
        return $this->json($comment);
    }

    #[Route('', name: 'comment_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $comment = new Comment();
        $comment->setContent($data['content'] ?? '');
        $comment->setCreatedAt(new \DateTime());

        $task = $this->em->getRepository(Task::class)->find($data['taskId']);
        $user = $this->em->getRepository(User::class)->find($data['authorId']);

        $comment->setTask($task);
        $comment->setAuthor($user);

        $this->em->persist($comment);
        $this->em->flush();

        return $this->json($comment, 201);
    }

    #[Route('/{id}', name: 'comment_update', methods: ['PUT'])]
    public function update(Request $request, Comment $comment): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $comment->setContent($data['content'] ?? $comment->getContent());
        $this->em->flush();

        return $this->json($comment);
    }

    #[Route('/{id}', name: 'comment_delete', methods: ['DELETE'])]
    public function delete(Comment $comment): JsonResponse
    {
        $this->em->remove($comment);
        $this->em->flush();

        return $this->json(['message' => 'Deleted']);
    }
}
