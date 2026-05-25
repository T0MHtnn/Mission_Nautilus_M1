import { createRouter, createWebHistory } from "vue-router";
import { useGameStore } from "../stores/game";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/map",
      name: "map",
      component: () => import("../views/MapView.vue"),
      // @ts-ignore
      prefetch: true,
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/ProfileView.vue"),
    },
  ],
});

router.beforeEach((to, from, next) => {
  const store = useGameStore();

  if (to.name === 'home' && store.token) {
    next({ name: 'map' });
  }
  else if (to.name === 'map' && !store.token) {
    next({ name: 'home' });
  }
  else {
    next();
  }
});

export default router;
