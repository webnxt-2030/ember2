"""
Hackathon Judge Q&A Reference Sheet — Ember
=============================================

Purpose: Tough questions judges will ask. Each section lists the question and the angle to defend.
🔴 = Prepare a 30-second answer.
Context: Ember is a decentralized crowdfunding platform on Morph L2 — immutable, per-project escrow, backer-voted milestone releases.

This module provides a structured, type-safe, and fully documented reference sheet with comprehensive error handling,
logging, input validation, and performance optimizations.
"""

from __future__ import annotations

import enum
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union, Final, Any, Set
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
import json
import re
import hashlib
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import threading

# Configure logging with proper levels and format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ember_qa_reference.log'),
        logging.StreamHandler()
    ]
)
logger: Final[logging.Logger] = logging.getLogger(__name__)


class QuestionSeverity(enum.Enum):
    """Enumeration for question severity levels."""
    CRITICAL = "🔴"  # Requires 30-second prepared answer
    HIGH = "🟡"      # Important but no prepared answer required
    MEDIUM = "🟢"    # Standard question
    LOW = "⚪"       # Informational


class QuestionCategory(enum.Enum):
    """Enumeration for question categories."""
    SMART_CONTRACT_SECURITY = "Smart Contract Security"
    MORPH_L2_SPECIFICS = "Morph L2 Specifics"
    BUSINESS_MODEL = "Business Model"
    WILDCARD_DEEP_TECHNICAL = "Wildcard / Deep Technical"


class ValidationError(Exception):
    """Custom exception for validation failures."""
    pass


class ConfigurationError(Exception):
    """Custom exception for configuration issues."""
    pass


class DataIntegrityError(Exception):
    """Custom exception for data integrity violations."""
    pass


class QuestionNotFoundError(Exception):
    """Custom exception for question not found."""
    pass


class DuplicateQuestionError(Exception):
    """Custom exception for duplicate question IDs."""
    pass


@dataclass(frozen=True)
class AnswerAngle:
    """
    Immutable data class representing the angle/defense for a question.
    
    Attributes:
        description: The main defense angle
        key_points: List of key talking points
        time_estimate_seconds: Expected answer duration
    """
    description: str
    key_points: List[str] = field(default_factory=list)
    time_estimate_seconds: int = 30

    def __post_init__(self) -> None:
        """Validate the answer angle after initialization."""
        if not self.description or not self.description.strip():
            raise ValidationError("Answer angle description cannot be empty")
        if self.time_estimate_seconds <= 0:
            raise ValidationError("Time estimate must be positive")
        if self.time_estimate_seconds > 120:
            logger.warning(f"Unusually long answer time: {self.time_estimate_seconds}s")
        
        # Validate key points
        for i, point in enumerate(self.key_points):
            if not point or not point.strip():
                raise ValidationError(f"Key point at index {i} cannot be empty")

    def to_dict(self) -> Dict[str, Any]:
        """Convert answer angle to dictionary for serialization."""
        return {
            'description': self.description,
            'key_points': self.key_points.copy(),
            'time_estimate_seconds': self.time_estimate_seconds
        }


@dataclass(frozen=True)
class Question:
    """
    Immutable data class representing a judge's question.
    
    Attributes:
        id: Unique question identifier
        text: The question text
        category: Question category
        severity: Question severity level
        answer_angle: The defense angle for answering
        tags: Additional metadata tags
        created_at: Timestamp of creation
        version: Version number for tracking changes
    """
    id: str
    text: str
    category: QuestionCategory
    severity: QuestionSeverity
    answer_angle: AnswerAngle
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    version: int = 1

    def __post_init__(self) -> None:
        """Validate the question after initialization."""
        if not self.id or not self.id.strip():
            raise ValidationError("Question ID cannot be empty")
        if not self.text or not self.text.strip():
            raise ValidationError("Question text cannot be empty")
        if not isinstance(self.category, QuestionCategory):
            raise ValidationError(f"Invalid category: {self.category}")
        if not isinstance(self.severity, QuestionSeverity):
            raise ValidationError(f"Invalid severity: {self.severity}")
        if self.version < 1:
            raise ValidationError(f"Invalid version: {self.version}. Must be >= 1")
        
        # Validate ID format
        if not re.match(r'^Q\d+$', self.id):
            raise ValidationError(f"Invalid question ID format: {self.id}. Expected format: Q<number>")
        
        # Validate tags
        for tag in self.tags:
            if not tag or not tag.strip():
                raise ValidationError("Tags cannot be empty")

    def requires_prepared_answer(self) -> bool:
        """Check if this question requires a 30-second prepared answer."""
        return self.severity == QuestionSeverity.CRITICAL

    def to_dict(self) -> Dict[str, Any]:
        """Convert question to dictionary for serialization."""
        return {
            'id': self.id,
            'text': self.text,
            'category': self.category.value,
            'severity': self.severity.value,
            'answer_angle': self.answer_angle.to_dict(),
            'tags': self.tags.copy(),
            'created_at': self.created_at.isoformat(),
            'version': self.version
        }

    def to_json(self) -> str:
        """Serialize question to JSON string."""
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Question:
        """Create Question from dictionary with validation."""
        required_fields = ['id', 'text', 'category', 'severity', 'answer_angle']
        for field_name in required_fields:
            if field_name not in data:
                raise ValidationError(f"Missing required field: {field_name}")
        
        category = QuestionCategory(data['category'])
        severity = QuestionSeverity(data['severity'])
        answer_angle = AnswerAngle(**data['answer_angle'])
        
        return cls(
            id=data['id'],
            text=data['text'],
            category=category,
            severity=severity,
            answer_angle=answer_angle,
            tags=data.get('tags', []),
            created_at=datetime.fromisoformat(data.get('created_at', datetime.utcnow().isoformat())),
            version=data.get('version', 1)
        )


class QuestionRepository(ABC):
    """Abstract base class for question storage."""
    
    @abstractmethod
    def get_question(self, question_id: str) -> Optional[Question]:
        """Retrieve a question by its ID."""
        pass

    @abstractmethod
    def get_questions_by_category(self, category: QuestionCategory) -> List[Question]:
        """Retrieve all questions in a given category."""
        pass

    @abstractmethod
    def get_critical_questions(self) -> List[Question]:
        """Retrieve all questions requiring prepared answers."""
        pass

    @abstractmethod
    def add_question(self, question: Question) -> None:
        """Add a new question to the repository."""
        pass

    @abstractmethod
    def update_question(self, question: Question) -> None:
        """Update an existing question."""
        pass

    @abstractmethod
    def delete_question(self, question_id: str) -> None:
        """Delete a question by its ID."""
        pass

    @abstractmethod
    def search_questions(self, query: str) -> List[Question]:
        """Search questions by text content."""
        pass

    @abstractmethod
    def get_all_questions(self) -> List[Question]:
        """Retrieve all questions."""
        pass

    @abstractmethod
    def get_statistics(self) -> Dict[str, Any]:
        """Get repository statistics."""
        pass


class InMemoryQuestionRepository(QuestionRepository):
    """
    In-memory implementation of QuestionRepository with thread-safe operations.
    
    This implementation provides O(1) lookup for questions by ID and O(n) for category queries.
    For production, consider using a database-backed implementation.
    
    Thread-safe using Read-Write lock for concurrent access.
    """
    
    def __init__(self) -> None:
        """Initialize the in-memory repository."""
        self._questions: Dict[str, Question] = {}
        self._category_index: Dict[QuestionCategory, Set[str]] = {
            category: set() for category in QuestionCategory
        }
        self._critical_ids: Set[str] = set()
        self._lock = threading.RWLock()
        self._executor = ThreadPoolExecutor(max_workers=4)
        logger.info("Initialized InMemoryQuestionRepository")

    def get_question(self, question_id: str) -> Optional[Question]:
        """
        Retrieve a question by its ID.
        
        Args:
            question_id: The unique identifier of the question
            
        Returns:
            The Question object if found, None otherwise
            
        Raises:
            ValidationError: If question_id is invalid
        """
        if not question_id or not question_id.strip():
            raise ValidationError("Question ID cannot be empty")
        
        with self._lock.read_lock():
            question = self._questions.get(question_id)
            if question is None:
                logger.warning(f"Question not found: {question_id}")
            else:
                logger.debug(f"Retrieved question: {question_id}")
            return question

    def get_questions_by_category(self, category: QuestionCategory) -> List[Question]:
        """
        Retrieve all questions in a given category.
        
        Args:
            category: The category to filter by
            
        Returns:
            List of Question objects in the category
            
        Raises:
            ValidationError: If category is invalid
        """
        if not isinstance(category, QuestionCategory):
            raise ValidationError(f"Invalid category: {category}")
        
        with self._lock.read_lock():
            question_ids = self._category_index.get(category, set())
            questions = [self._questions[qid] for qid in question_ids if qid in self._questions]
            logger.debug(f"Retrieved {len(questions)} questions for category: {category.value}")
            return questions

    def get_critical_questions(self) -> List[Question]:
        """
        Retrieve all questions requiring prepared answers.
        
        Returns:
            List of critical Question objects
        """
        with self._lock.read_lock():
            questions = [self._questions[qid] for qid in self._critical_ids if qid in self._questions]
            logger.debug(f"Retrieved {len(questions)} critical questions")
            return questions

    def add_question(self, question: Question) -> None:
        """
        Add a new question to the repository.
        
        Args:
            question: The Question object to add
            
        Raises:
            ValidationError: If question is invalid
            DuplicateQuestionError: If question ID already exists
        """
        if not isinstance(question, Question):
            raise ValidationError("Must provide a Question object")
        
        with self._lock.write_lock():
            if question.id in self._questions:
                raise DuplicateQuestionError(f"Question ID already exists: {question.id}")
            
            self._questions[question.id] = question
            self._category_index[question.category].add(question.id)
            
            if question.requires_prepared_answer():
                self._critical_ids.add(question.id)
            
            logger.info(f"Added question: {question.id}")

    def update_question(self, question: Question) -> None:
        """
        Update an existing question.
        
        Args:
            question: The updated Question object
            
        Raises:
            ValidationError: If question is invalid
            QuestionNotFoundError: If question ID doesn't exist
        """
        if not isinstance(question, Question):
            raise ValidationError("Must provide a Question object")
        
        with self._lock.write_lock():
            if question.id not in self._questions:
                raise QuestionNotFoundError(f"Question not found: {question.id}")
            
            old_question = self._questions[question.id]
            
            # Update category index if category changed
            if old_question.category != question.category:
                self._category_index[old_question.category].discard(question.id)
                self._category_index[question.category].add(question.id)
            
            # Update critical set if severity changed
            if old_question.requires_prepared_answer() != question.requires_prepared_answer():
                if question.requires_prepared_answer():
                    self._critical_ids.add(question.id)
                else:
                    self._critical_ids.discard(question.id)
            
            # Update question with incremented version
            updated_question = Question(
                id=question.id,
                text=question.text,
                category=question.category,
                severity=question.severity,
                answer_angle=question.answer_angle,
                tags=question.tags,
                created_at=old_question.created_at,
                version=old_question.version + 1
            )
            self._questions[question.id] = updated_question
            logger.info(f"Updated question: {question.id} (version {updated_question.version})")

    def delete_question(self, question_id: str) -> None:
        """
        Delete a question by its ID.
        
        Args:
            question_id: The ID of the question to delete
            
        Raises:
            ValidationError: If question_id is invalid
            QuestionNotFoundError: If question ID doesn't exist
        """
        if not question_id or not question_id.strip():
            raise ValidationError("Question ID cannot be empty")
        
        with self._lock.write_lock():
            if question_id not in self._questions:
                raise QuestionNotFoundError(f"Question not found: {question_id}")
            
            question = self._questions.pop(question_id)
            self._category_index[question.category].discard(question_id)
            self._critical_ids.discard(question_id)
            
            logger.info(f"Deleted question: {question_id}")

    def search_questions(self, query: str) -> List[Question]:
        """
        Search questions by text content.
        
        Args:
            query: The search query string
            
        Returns:
            List of matching Question objects
            
        Raises:
            ValidationError: If query is invalid
        """
        if not query or not query.strip():
            raise ValidationError("Search query cannot be empty")
        
        query_lower = query.lower().strip()
        
        with self._lock.read_lock():
            results = []
            for question in self._questions.values():
                if (query_lower in question.text.lower() or 
                    query_lower in question.answer_angle.description.lower() or
                    any(query_lower in tag.lower() for tag in question.tags)):
                    results.append(question)
            
            logger.debug(f"Search for '{query}' returned {len(results)} results")
            return results

    def get_all_questions(self) -> List[Question]:
        """
        Retrieve all questions.
        
        Returns:
            List of all Question objects
        """
        with self._lock.read_lock():
            questions = list(self._questions.values())
            logger.debug(f"Retrieved all {len(questions)} questions")
            return questions

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get repository statistics.
        
        Returns:
            Dictionary containing repository statistics
        """
        with self._lock.read_lock():
            total = len(self._questions)
            by_category = {
                category.value: len(ids) 
                for category, ids in self._category_index.items()
            }
            critical_count = len(self._critical_ids)
            
            return {
                'total_questions': total,
                'questions_by_category': by_category,
                'critical_questions': critical_count,
                'last_updated': datetime.utcnow().isoformat()
            }


class QuestionManager:
    """
    High-level manager for question operations with caching and batch processing.
    
    Provides a simplified interface for common operations with performance optimizations.
    """
    
    def __init__(self, repository: QuestionRepository) -> None:
        """
        Initialize the question manager.
        
        Args:
            repository: The question repository to use
            
        Raises:
            ValidationError: If repository is invalid
        """
        if not isinstance(repository, QuestionRepository):
            raise ValidationError("Must provide a valid QuestionRepository")
        
        self._repository = repository
        self._cache: Dict[str, Question] = {}
        self._cache_lock = threading.Lock()
        logger.info("Initialized QuestionManager")

    @lru_cache(maxsize=128)
    def get_question_cached(self, question_id: str) -> Optional[Question]:
        """
        Get question with caching for performance.
        
        Args:
            question_id: The question ID to retrieve
            
        Returns:
            Question object if found, None otherwise
        """
        return self._repository.get_question(question_id)

    def get_questions_by_severity(self, severity: QuestionSeverity) -> List[Question]:
        """
        Get all questions of a specific severity.
        
        Args:
            severity: The severity level to filter by
            
        Returns:
            List of matching Question objects
        """
        all_questions = self._repository.get_all_questions()
        return [q for q in all_questions if q.severity == severity]

    def prepare_answer_sheet(self) -> Dict[str, Any]:
        """
        Generate a structured answer sheet for all critical questions.
        
        Returns:
            Dictionary with organized answer preparation data
        """
        critical_questions = self._repository.get_critical_questions()
        
        answer_sheet = {
            'prepared_answers': [],
            'total_critical': len(critical_questions),
            'generated_at': datetime.utcnow().isoformat()
        }
        
        for question in critical_questions:
            answer_entry = {
                'question_id': question.id,
                'question_text': question.text,
                'category': question.category.value,
                'answer_angle': question.answer_angle.description,
                'key_points': question.answer_angle.key_points,
                'time_estimate': f"{question.answer_angle.time_estimate_seconds} seconds"
            }
            answer_sheet['prepared_answers'].append(answer_entry)