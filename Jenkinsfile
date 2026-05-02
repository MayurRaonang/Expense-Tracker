pipeline {
  agent any

  tools {
    nodejs 'NodeJS-20'
  }

  environment {
    DOCKERHUB_USER    = 'your-dockerhub-username'
    IMAGE_TAG         = "${BUILD_NUMBER}-${GIT_COMMIT[0..6]}"

    FRONTEND_IMAGE    = "${DOCKERHUB_USER}/expense-frontend:${IMAGE_TAG}"
    BACKEND_IMAGE     = "${DOCKERHUB_USER}/expense-backend:${IMAGE_TAG}"
    ML_IMAGE          = "${DOCKERHUB_USER}/expense-ml:${IMAGE_TAG}"

    SONAR_PROJECT_KEY = 'expense-tracker'
  }
    stages {

    stage('Checkout') {
      steps {
        checkout scm
        echo "Building branch: ${env.BRANCH_NAME}"
        echo "Commit: ${env.GIT_COMMIT}"
      }
    }

    stage('Install Dependencies') {
      parallel {
        stage('Frontend deps') {
          steps {
            dir('frontend') {
              sh 'npm install'
            }
          }
        }
        stage('Backend deps') {
          steps {
            dir('backend') {
              sh 'npm install'
            }
          }
        }
        stage('ML deps') {
          steps {
            dir('ml_service') {
                sh '''
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install -r requirements.txt --quiet
                '''
            }
          }
        }
      }
    }

    stage('Run Tests') {
      parallel {
        stage('Frontend tests') {
          steps {
            dir('frontend') {
              sh 'npm test || true'
            }
          }
        }
        stage('Backend tests') {
          steps {
            dir('backend') {
              sh 'npm test'
            }
          }
        }
        stage('ML tests') {
          steps {
            dir('ml_service') {
              sh '''
                    . venv/bin/activate
                    python3 -m pytest tests/ -v || true
                '''
            }
          }
        }
      }
    }
    stage('SonarQube Analysis') {
      steps {
        dir('frontend') {
          withSonarQubeEnv('SonarQube') {
            sh 'npm test'
            sh "${tool 'SonarQube-Scanner'}/bin/sonar-scanner"
          }
        }
        dir('backend') {
          withSonarQubeEnv('SonarQube') {
            sh 'npm test'
            sh "${tool 'SonarQube-Scanner'}/bin/sonar-scanner"
          }
        }
        dir('ml_service') {
          withSonarQubeEnv('SonarQube') {
            sh '''
              . venv/bin/activate
              pytest tests/ --cov=. --cov-report=xml --cov-report=term
              ${SONAR_SCANNER_HOME}/bin/sonar-scanner
            '''
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          docker build -t ${FRONTEND_IMAGE} ./frontend
          docker build -t ${BACKEND_IMAGE}  ./backend
          docker build -t ${ML_IMAGE}       ./ml_service
        '''
      }
    }

    stage('Push to DockerHub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
            docker push ${FRONTEND_IMAGE}
            docker push ${BACKEND_IMAGE}
            docker push ${ML_IMAGE}
            docker logout
          '''
        }
      }
    }
    stage('Deploy to Kubernetes') {
      when {
        branch 'main'
      }
      steps {
        withKubeConfig([credentialsId: 'kubeconfig-credentials']) {
          sh '''
            # Update image tags in manifests dynamically
            sed -i "s|FRONTEND_IMAGE_TAG|${FRONTEND_IMAGE}|g" k8s/frontend-deployment.yaml
            sed -i "s|BACKEND_IMAGE_TAG|${BACKEND_IMAGE}|g"   k8s/backend-deployment.yaml
            sed -i "s|ML_IMAGE_TAG|${ML_IMAGE}|g"             k8s/ml-deployment.yaml

            # Apply all manifests
            kubectl apply -f k8s/

            # Wait for rollout to complete
            kubectl rollout status deployment/frontend -n expense-tracker --timeout=120s
            kubectl rollout status deployment/backend  -n expense-tracker --timeout=120s
            kubectl rollout status deployment/ml-service -n expense-tracker --timeout=120s
          '''
        }
      }
    }

  } // end stages
    post {
    success {
      echo "Pipeline SUCCESS — Image tag: ${IMAGE_TAG}"
      // Optional: add Slack or email notification here
    }

    failure {
      echo "Pipeline FAILED on branch ${env.BRANCH_NAME}"
      // Optional: notify team on failure
    }

    always {
      // Clean up dangling Docker images to save disk space on Jenkins EC2
      sh 'docker image prune -f'

      // Archive test results if they exist
      junit allowEmptyResults: true,
        testResults: '**/test-results/*.xml'
    }
  }
} // end pipeline