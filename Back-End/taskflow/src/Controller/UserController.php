<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

#[Route('/api/users')]
final class UserController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}


    #[Route('', name: 'user_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $users = $this->em->getRepository(User::class)->findAll();
        return $this->json($users, 200, [], ['groups' => ['user:read']]);
    }


    #[Route('/{id}', name: 'user_show', methods: ['GET'])]
    public function show(User $user): JsonResponse
    {
        return $this->json($user, 200, [], ['groups' => ['user:read']]);
    }


    #[Route('', name: 'user_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!$data['email'] || !$data['password'] || !$data['name']) {
            return $this->json(['error' => 'Données manquantes'], 400);
        }

        $existing = $this->em->getRepository(User::class)->findOneBy(['email' => $data['email']]);
        if ($existing) return $this->json(['error' => 'Email déjà utilisé'], 400);

        $user = new User();
        $user->setEmail($data['email']);
        $user->setName($data['name']);
        $user->setPassword(password_hash($data['password'], PASSWORD_BCRYPT));
        if (isset($data['roles']) && is_array($data['roles'])) {
            $user->setRoles($data['roles']);
        } else {
            $user->setRoles(['ROLE_USER']);
        }

        $this->em->persist($user);
        $this->em->flush();

        return $this->json(['message' => 'Inscription réussie'], 201);
    }


    #[Route('/{id}', name: 'user_update', methods: ['PUT'])]
    public function update(Request $request, User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $user->setName($data['name'] ?? $user->getName());
        $user->setEmail($data['email'] ?? $user->getEmail());

        if (isset($data['roles']) && is_array($data['roles'])) {
            $user->setRoles($data['roles']);
        }

        if (isset($data['password']) && $data['password']) {
            $user->setPassword(password_hash($data['password'], PASSWORD_BCRYPT));
        }

        $this->em->flush();

        return $this->json($user, 200, [], ['groups' => ['user:read']]);
    }


    #[Route('/{id}', name: 'user_delete', methods: ['DELETE'])]
    public function delete(User $user): JsonResponse
    {
        $this->em->remove($user);
        $this->em->flush();

        return $this->json(['message' => 'Deleted'], 200);
    }
}
