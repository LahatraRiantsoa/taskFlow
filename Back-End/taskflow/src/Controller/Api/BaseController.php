<?php
namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use App\Security\SupabaseAuthService;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\User;

class BaseController extends AbstractController
{
    protected function getUserFromRequest(Request $request, SupabaseAuthService $authService, EntityManagerInterface $em): ?User
    {
        $auth = $request->headers->get('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) return null;
        $token = substr($auth, 7);
        $claims = $authService->validateToken($token);
        if (!$claims || !isset($claims['sub'])) return null;

        $userId = $claims['sub'];
        $userRepo = $em->getRepository(User::class);
        $user = $userRepo->find($userId);
        if (!$user) {
            // create minimal user record
            $user = new User();
            $user->setId($userId);
            $user->setEmail($claims['email'] ?? ('user_'.$userId));
            $user->setName($claims['user_metadata']['full_name'] ?? null);
            $user->setRoles(['ROLE_USER']);
            $em->persist($user);
            $em->flush();
        }
        return $user;
    }
}
