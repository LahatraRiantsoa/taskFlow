<?php

namespace App\Controller;

use App\Entity\TaskShare;
use App\Entity\Task;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/shared-tasks')]
final class TaskShareController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('', name: 'shared_task_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $Taskshares = $this->em->getRepository(TaskShare::class)->findAll();
        return $this->json($Taskshares);
    }

    #[Route('/{id}', name: 'shared_task_show', methods: ['GET'])]
    public function show(TaskShare $Taskshare): JsonResponse
    {
        return $this->json($Taskshare);
    }

    #[Route('', name: 'shared_task_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $Taskshare = new TaskShare();
        $task = $this->em->getRepository(Task::class)->find($data['taskId']);
        $user = $this->em->getRepository(User::class)->find($data['userId']);

        $Taskshare->setTask($task);
        $Taskshare->setUsers($user);
        $Taskshare->setPermission($data['permission'] ?? 'contributor');
        $Taskshare->setRole($data['role'] ?? 'contributor');

        $this->em->persist($Taskshare);
        $this->em->flush();

        return $this->json($Taskshare, 201);
    }

    #[Route('/{id}', name: 'shared_task_update', methods: ['PUT'])]
    public function update(Request $request, TaskShare $Taskshare): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $Taskshare->setPermission($data['permission'] ?? $Taskshare->getPermission());
        $this->em->flush();

        return $this->json($Taskshare);
    }

    #[Route('/{id}', name: 'shared_task_delete', methods: ['DELETE'])]
    public function delete(TaskShare $Taskshare): JsonResponse
    {
        $this->em->remove($Taskshare);
        $this->em->flush();

        return $this->json(['message' => 'Deleted']);
    }
}
