<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    private string $jwt_secret = 'ton_secret_jwt';

    public function __construct(private EntityManagerInterface $em) {}


    #[Route('/register', name: 'register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
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


    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $data['email']]);

        if (!$user || !password_verify($data['password'], $user->getPassword())) {
            return $this->json(['error' => 'Email ou mot de passe invalide'], 401);
        }


        $payload = [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'exp' => time() + 3600
        ];

        $jwt = JWT::encode($payload, $this->jwt_secret, 'HS256');

        return $this->json(['token' => $jwt]);
    }

    #[Route('/me', name: 'profile', methods: ['GET'])]
    public function profile(Request $request): JsonResponse
    {
        $authHeader = $request->headers->get('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return $this->json(['error' => 'Token manquant'], 401);
        }

        $token = substr($authHeader, 7);
        try {
            $payload = (array) JWT::decode($token, new \Firebase\JWT\Key($this->jwt_secret, 'HS256'));
            $user = $this->em->getRepository(User::class)->find($payload['id'] ?? null);
            if (!$user) return $this->json(['error' => 'Utilisateur non trouvé'], 404);

            return $this->json([
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getName(),
                'roles' => $user->getRoles()
            ]);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Token invalide'], 401);
        }
    }
}
