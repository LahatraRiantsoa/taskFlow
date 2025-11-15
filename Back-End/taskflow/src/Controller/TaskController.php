<?php

namespace App\Controller;

use App\Entity\Task;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

#[Route('/api/tasks')]
final class TaskController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('', name: 'task_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $tasks = $this->em->getRepository(Task::class)->findAll();

        $data = array_map(fn(Task $task) => [
            'id' => $task->getId(),
            'title' => $task->getTitle(),
            'description' => $task->getDescription(),
            'dueDate' => $task->getDueDate()?->format('c'),
            'priority' => $task->getPriority(),
            'status' => $task->getStatus(),
            'ownerId' => $task->getOwner()?->getId(),
            'createdAt' => $task->getCreatedAt()?->format('c'),
            'updatedAt' => $task->getUpdatedAt()?->format('c'),
        ], $tasks);

        return $this->json($data);
    }

    #[Route('/{id}', name: 'task_show', methods: ['GET'])]
    public function show(Task $task): JsonResponse
    {
        return $this->json($task);
    }
    #[Route('/add', name: 'task_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $task = new Task();
        $task->setTitle($data['title']);
        $task->setDescription($data['description'] ?? '');
        $task->setStatus($data['status'] ?? 'pending');
        $task->setPriority($data['priority'] ?? 1);
        $task->setDueDate(isset($data['dueDate']) ? new \DateTime($data['dueDate']) : null);

        $owner = $this->em->getRepository(User::class)->find($data['ownerId']);
        if (!$owner) {
            return $this->json(['error' => 'Utilisateur non trouvé', 'ownerId' => $data['ownerId']], 404);
        }
        $task->setOwner($owner);

        $now = new \DateTime();
        $task->setCreatedAt($now);
        $task->setUpdatedAt($now);

        $this->em->persist($task);
        $this->em->flush();

        return $this->json($task, 201);
    }



    #[Route('/{id}', name: 'task_update', methods: ['PUT'])]
    public function update(Request $request, Task $task): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $task->setTitle($data['title'] ?? $task->getTitle());
        $task->setDescription($data['description'] ?? $task->getDescription());
        $task->setStatus($data['status'] ?? $task->getStatus());
        $task->setPriority($data['priority'] ?? $task->getPriority());
        if (isset($data['dueDate'])) $task->setDueDate(new \DateTime($data['dueDate']));
        $this->em->flush();
        return $this->json($task);
    }

    #[Route('/{id}', name: 'task_delete', methods: ['DELETE'])]
    public function delete(Task $task): JsonResponse
    {
        $this->em->remove($task);
        $this->em->flush();
        return $this->json(['message' => 'Deleted']);
    }
}
